'use client'

import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BackButton } from '@/components/ui/back-button'
import { Database } from '@/lib/database.types'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

const servicingSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  location: z.string().min(5, 'Location is required'),
  phone: z.string().min(8, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  logoUrl: z.string().optional(),
})

type ServicingForm = z.infer<typeof servicingSchema>

export default function EditServicingPage({
  params,
}: {
  params: { slug: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [servicingId, setServicingId] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const form = useForm<ServicingForm>({
    resolver: zodResolver(servicingSchema),
    defaultValues: {
      businessName: '',
      location: '',
      phone: '',
      email: '',
      description: '',
      website: '',
      logoUrl: '',
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

        // Fetch servicing by slug
        const { data: servicing, error: servicingError } = await supabase
          .from('servicing')
          .select('*')
          .eq('slug', params.slug)
          .single()

        if (servicingError || !servicing) {
          console.error('Error fetching servicing:', servicingError)
          toast({
            title: 'Servicing not found',
            description:
              "The servicing provider you're trying to edit doesn't exist.",
            variant: 'destructive',
          })
          router.push('/establishments/servicing')
          return
        }

        // Check if user is the owner
        if (servicing.owner_id !== session.user.id) {
          toast({
            title: 'Unauthorized',
            description:
              "You don't have permission to edit this servicing provider.",
            variant: 'destructive',
          })
          router.push(`/establishments/servicing/${params.slug}`)
          return
        }

        if (mounted) {
          setServicingId(servicing.id)
          setIsAuthorized(true)

          // Set form values
          form.reset({
            businessName: servicing.business_name,
            location: servicing.location,
            phone: servicing.phone || '',
            email: servicing.email || '',
            description: servicing.description || '',
            website: servicing.website || '',
            logoUrl: servicing.logo_url || '',
          })

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

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }

    if (!servicingId) {
      toast({
        title: 'Error',
        description: 'Servicing information is missing.',
        variant: 'destructive',
      })
      return
    }

    const file = event.target.files[0]

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Logo image must be less than 5MB.',
        variant: 'destructive',
      })
      return
    }

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only JPEG, PNG, and WebP images are allowed.',
        variant: 'destructive',
      })
      return
    }

    setUploadingLogo(true)

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

      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `servicing/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('servicing')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('servicing').getPublicUrl(filePath)

      // Update form
      form.setValue('logoUrl', publicUrl)

      toast({
        title: 'Logo uploaded',
        description: 'Your logo has been uploaded successfully.',
      })
    } catch (error) {
      console.error('Logo upload error:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  async function onSubmit(data: ServicingForm) {
    try {
      setIsLoading(true)

      if (!servicingId) {
        throw new Error('Servicing ID is missing')
      }

      // Create slug from business name if name has changed
      let slugToUse = params.slug
      if (form.formState.dirtyFields.businessName) {
        slugToUse = data.businessName
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
      }

      const { error } = await supabase
        .from('servicing')
        .update({
          business_name: data.businessName,
          location: data.location,
          phone: data.phone,
          email: data.email,
          description: data.description,
          website: data.website || null,
          logo_url: data.logoUrl || null,
          slug: slugToUse,
        })
        .eq('id', servicingId)

      if (error) throw error

      toast({
        title: 'Servicing updated',
        description: 'Your servicing profile has been updated successfully.',
      })

      router.push(`/establishments/servicing/${slugToUse}`)
    } catch (error) {
      console.error('Edit error:', error)
      toast({
        title: 'Update failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // Component will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <BackButton 
          label="Back to servicing profile" 
          href={`/establishments/servicing/${params.slug}`}
          className="mb-6"
        />

        <Card>
          <CardHeader>
            <CardTitle>Edit Servicing Profile</CardTitle>
            <CardDescription>
              Update your servicing provider's information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your business name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Logo</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {field.value && (
                            <img
                              src={field.value}
                              alt="Business logo preview"
                              className="w-32 h-32 object-contain rounded-lg"
                            />
                          )}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                          />
                          <Input type="hidden" {...field} />
                          {uploadingLogo && (
                            <p className="text-sm text-muted-foreground">
                              Uploading logo...
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your business address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+356 1234 5678"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="info@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your servicing business and services offered"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || uploadingLogo}
                >
                  {isLoading ? 'Updating profile...' : 'Update Profile'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
