'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { resizeImageForUpload } from '@/lib/image-resize'
import {
  DEFAULT_LISTING_IMAGE,
  formatImageUrls,
  getListingStoragePathFromUrl,
  moveImageToPrimary,
  parseImageUrls,
  resolveThumbnail,
  withoutDefaultListingImage,
} from '@/lib/listing-images'
import { ListingImageGrid } from '@/components/marketplace/ListingImageGrid'
import { BackButton } from '@/components/ui/back-button'
import { DeleteConfirmationDialog } from '@/components/dialogs'
import { Trash2 } from 'lucide-react'
import { PageLayout } from '@/components/ui/page-layout'
import { slugify } from '@/lib/format'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 6
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

const firearmsCategories = {
  airguns: 'Airguns',
  ammunition: 'Ammunition',
  black_powder: 'Black powder',
  carbines: 'Carbines',
  crossbow: 'Crossbow',
  pistols: 'Pistols',
  replica_deactivated: 'Replica or Deactivated',
  revolvers: 'Revolvers',
  rifles: 'Rifles',
  schedule_1: 'Schedule 1 (automatic)',
  shotguns: 'Shotguns',
} as const

const nonFirearmsCategories = {
  airsoft: 'Airsoft',
  reloading: 'Reloading',
  militaria: 'Militaria',
  accessories: 'Accessories',
} as const

const subcategories = {
  airsoft: {
    airsoft_guns: 'Airsoft Guns',
    bbs_co2: 'BBs & CO2',
    batteries_electronics: 'Batteries & Electronics',
    clothing: 'Clothing',
    other: 'Other',
  },
  reloading: {
    presses: 'Presses',
    dies: 'Dies',
    tools: 'Tools',
    tumblers_media: 'Tumblers & Media',
    primers_heads: 'Primers & Heads',
    other: 'Other',
  },
  militaria: {
    uniforms: 'Uniforms',
    helmets: 'Helmets',
    swords_bayonets_knives: 'Swords, Bayonets & Knives',
    medals_badges: 'Medals & Badges',
    other: 'Other',
  },
  accessories: {
    cleaning_maintenance: 'Cleaning & Maintenance',
    bipods_stands: 'Bipods & Stands',
    slings_holsters: 'Slings & Holsters',
    scopes_sights_optics: 'Scopes, Sights & Optics',
    magazines: 'Magazines',
    books_manuals: 'Books & Manuals',
    hunting_equipment: 'Hunting Equipment',
    safes_cabinets: 'Safes & Cabinets',
    ammo_boxes: 'Ammo Boxes',
    gun_cases: 'Gun Cases',
    safety_equipment: 'Safety Equipment',
    grips: 'Grips',
    other: 'Other',
  },
} as const

const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.coerce.number().min(1, 'Price must be at least €1'),
  type: z.enum(['firearms', 'non_firearms']),
  category: z.string().min(1, 'Please select a category'),
  subcategory: z.string().optional(),
  calibre: z.string().optional(),
})

type ListingForm = z.infer<typeof listingSchema>

export default function EditListing(props: {
  params: Promise<{ slug: string }>
}) {
  const params = use(props.params)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [listingId, setListingId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<
    'firearms' | 'non_firearms' | null
  >(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const form = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      type: 'firearms',
      category: '',
      subcategory: '',
      calibre: '',
    },
  })

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
      try {
        // Get session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push('/login')
          return
        }

        if (!session) {
          console.log('No session found')
          router.push('/login')
          return
        }

        // Validate session expiry
        const sessionExpiry = new Date(session.expires_at! * 1000)
        const now = new Date()
        const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
        const isNearExpiry = timeUntilExpiry < 5 * 60 * 1000 // 5 minutes

        if (isNearExpiry) {
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession()

          if (refreshError || !refreshedSession) {
            console.error('Session refresh failed:', refreshError)
            router.push('/login')
            return
          }
        }

        // Fetch listing by slug
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .filter('title', 'ilike', `%${params.slug.replace(/-/g, ' ')}%`)

        if (error || !data || data.length === 0) {
          console.error('Error fetching listing:', error)
          toast({
            title: 'Listing not found',
            description: "The listing you're trying to edit doesn't exist.",
            variant: 'destructive',
          })
          router.push('/marketplace')
          return
        }

        // Find the best match by comparing the slugified title with the provided slug
        const listing =
          data.find(item => {
            const itemSlug = slugify(item.title)
            return itemSlug === params.slug || itemSlug.includes(params.slug)
          }) || data[0]

        // Check if user is the owner
        if (listing.seller_id !== session.user.id) {
          toast({
            title: 'Unauthorized',
            description: "You don't have permission to edit this listing.",
            variant: 'destructive',
          })
          router.push(`/marketplace/listing/${params.slug}`)
          return
        }

        const editableUntilIso = (listing as any).editable_until as
          | string
          | null
          | undefined
        const editableUntilMs = (() => {
          if (editableUntilIso) {
            const ts = Date.parse(editableUntilIso)
            return Number.isNaN(ts) ? null : ts
          }
          const createdTs = Date.parse((listing as any).created_at)
          return Number.isNaN(createdTs)
            ? null
            : createdTs + 48 * 60 * 60 * 1000
        })()

        if (editableUntilMs !== null && Date.now() > editableUntilMs) {
          toast({
            title: 'Editing locked',
            description:
              'This listing can no longer be edited (48-hour edit window has ended). Contact an admin if you need changes.',
            variant: 'destructive',
          })
          router.push(`/marketplace/listing/${params.slug}`)
          return
        }

        if (mounted) {
          setListingId(listing.id)
          setSelectedType(listing.type)
          setSelectedCategory(listing.category)
          setIsAuthorized(true)

          // Parse the images from PostgreSQL format
          const parsedImages = withoutDefaultListingImage(
            parseImageUrls(listing.images)
          )
          setExistingImages(parsedImages)

          // Set form values
          form.reset({
            title: listing.title,
            description: listing.description,
            price: listing.price,
            type: listing.type,
            category: listing.category,
            subcategory: listing.subcategory || '',
            calibre: listing.calibre || '',
          })

          // Create preview URLs for existing images
          setPreviewUrls(parsedImages)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error in session initialization:', error)
        toast({
          title: 'Error',
          description: 'Failed to initialize session. Please try again.',
          variant: 'destructive',
        })
        if (mounted) {
          setIsLoading(false)
        }
        router.push('/login')
      }
    }

    initializeSession()

    return () => {
      mounted = false
    }
  }, [params.slug, router, form, supabase, toast])

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }

    if (!listingId) {
      toast({
        title: 'Error',
        description: 'Listing information is missing.',
        variant: 'destructive',
      })
      return
    }

    const files = Array.from(event.target.files)

    if (files.length + previewUrls.length > MAX_FILES) {
      toast({
        title: 'Too many files',
        description: `Maximum ${MAX_FILES} images allowed`,
        variant: 'destructive',
      })
      return
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 5MB limit`,
          variant: 'destructive',
        })
        return
      }

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported image format`,
          variant: 'destructive',
        })
        return
      }
    }

    setIsUploading(true)
    const uploadedUrls: string[] = []

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }

      if (!session?.user.id) {
        throw new Error('Not authenticated')
      }

      for (const file of files) {
        const resized = await resizeImageForUpload(file)
        const fileExt = resized.name.split('.').pop()
        const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `listings/${listingId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(filePath, resized, {
            cacheControl: '31536000',
            upsert: false,
            contentType: resized.type,
          })

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('listings').getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      setPreviewUrls(prev => [...prev, ...uploadedUrls])

      toast({
        title: 'Images uploaded',
        description: 'Your images have been uploaded successfully.',
      })
    } catch (error) {
      console.error('Image upload error:', error)
      if (uploadedUrls.length > 0) {
        setPreviewUrls(prev => [...prev, ...uploadedUrls])
        toast({
          title: 'Partial upload',
          description: `${uploadedUrls.length} of ${files.length} images uploaded. Please try again for the rest.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Upload failed',
          description: 'Failed to upload images. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  function handleRemoveImage(index: number) {
    const imageUrl = previewUrls[index]
    if (!imageUrl) return

    if (existingImages.includes(imageUrl)) {
      setImagesToDelete(prev =>
        prev.includes(imageUrl) ? prev : [...prev, imageUrl]
      )
    } else {
      const path = getListingStoragePathFromUrl(imageUrl)
      if (path) {
        void supabase.storage.from('listings').remove([path])
      }
    }

    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  function handleSetPrimaryImage(index: number) {
    setPreviewUrls(prev => moveImageToPrimary(prev, index))
  }

  async function onSubmit(data: ListingForm) {
    if (!listingId) {
      toast({
        title: 'Error',
        description: 'Listing information is missing.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }

      if (!session?.user.id) {
        throw new Error('Not authenticated')
      }

      setUploadProgress(40)

      if (imagesToDelete.length > 0) {
        for (const imageUrl of imagesToDelete) {
          if (imageUrl === DEFAULT_LISTING_IMAGE) continue
          if (previewUrls.includes(imageUrl)) continue

          const path = getListingStoragePathFromUrl(imageUrl)
          if (!path) continue

          const { error: deleteError } = await supabase.storage
            .from('listings')
            .remove([path])

          if (deleteError) {
            console.error('Delete error:', deleteError)
          }
        }
      }

      setUploadProgress(70)

      const allImages =
        previewUrls.length > 0 ? previewUrls : [DEFAULT_LISTING_IMAGE]

      const { error: updateError } = await supabase
        .from('listings')
        .update({
          title: data.title,
          description: data.description,
          price: data.price,
          type: data.type,
          category: data.category,
          subcategory: data.subcategory || null,
          calibre: data.calibre || null,
          images: formatImageUrls(allImages),
          thumbnail: resolveThumbnail(allImages),
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      setUploadProgress(100)

      toast({
        title: 'Listing updated',
        description: 'Your listing has been updated successfully.',
      })

      router.push(`/marketplace/listing/${slugify(data.title)}`)
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update listing. Please try again.',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleDeleteListing() {
    if (!listingId) {
      toast({
        title: 'Error',
        description: 'Listing information is missing.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Get session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }

      if (!session?.user.id) {
        throw new Error('Not authenticated')
      }

      // Instead of deleting directly, use the server-side API
      const response = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
        }),
      })

      // Handle the response from the API
      if (!response.ok) {
        // Get the detailed error message from the API response
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete listing')
      }

      toast({
        title: 'Listing deleted',
        description: 'Your listing has been deleted successfully.',
      })

      // Redirect to profile
      router.push('/profile')
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete listing. Please try again or contact support if the issue persists.',
      })
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <PageLayout>
        <p className="text-muted-foreground">Loading...</p>
      </PageLayout>
    )
  }

  if (!isAuthorized) {
    return null // Component will redirect in useEffect
  }

  return (
    <PageLayout>
      <div className="mb-6 flex items-center justify-between">
        <BackButton
          label="Back"
          href={`/marketplace/listing/${params.slug}`}
          hideLabelOnMobile={false}
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          className="flex items-center gap-2"
          disabled={isUploading}
        >
          <Trash2 className="h-4 w-4" />
          Delete Listing
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Listing</CardTitle>
          <CardDescription>Update your listing information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-1">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter listing title"
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-1">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your item in detail"
                          className="min-h-32 resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Price (€)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Type
                      </FormLabel>
                      <Select
                        disabled={isUploading}
                        onValueChange={(value: 'firearms' | 'non_firearms') => {
                          field.onChange(value)
                          setSelectedType(value)
                          form.setValue('category', '')
                          form.setValue('subcategory', '')
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="firearms">Firearms</SelectItem>
                          <SelectItem value="non_firearms">
                            Non-Firearms
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Category
                      </FormLabel>
                      <Select
                        disabled={!selectedType || isUploading}
                        onValueChange={value => {
                          field.onChange(value)
                          setSelectedCategory(value)
                          form.setValue('subcategory', '')
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedType === 'firearms'
                            ? Object.entries(firearmsCategories).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                )
                              )
                            : selectedType === 'non_firearms'
                              ? Object.entries(nonFirearmsCategories).map(
                                  ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  )
                                )
                              : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType === 'non_firearms' &&
                  selectedCategory &&
                  subcategories[
                    selectedCategory as keyof typeof subcategories
                  ] && (
                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Subcategory
                          </FormLabel>
                          <Select
                            disabled={isUploading}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select subcategory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(
                                subcategories[
                                  selectedCategory as keyof typeof subcategories
                                ]
                              ).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                {selectedType === 'firearms' && (
                  <FormField
                    control={form.control}
                    name="calibre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Calibre
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 9mm, .22LR, 12 gauge"
                            className="h-10"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div>
                  <FormLabel className="text-base font-medium">
                    Images
                  </FormLabel>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload up to {MAX_FILES} images. Tap &quot;Set as main&quot;
                    to choose the display image shown on listings.
                  </p>

                  <ListingImageGrid
                    images={previewUrls}
                    uploading={isUploading}
                    maxFiles={MAX_FILES}
                    accept={ACCEPTED_IMAGE_TYPES.join(',')}
                    onUpload={handleImageUpload}
                    onRemove={handleRemoveImage}
                    onSetPrimary={handleSetPrimaryImage}
                  />
                </div>

                {isUploading && (
                  <div className="w-full bg-muted rounded-full h-3 mb-6">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Updating...' : 'Update Listing'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
        onConfirm={handleDeleteListing}
        confirmLabel="Delete Listing"
      />
    </PageLayout>
  )
}
