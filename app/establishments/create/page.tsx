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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Store, Users, Wrench, MapPin } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { Database } from '@/lib/database.types'
import Link from 'next/link'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

const establishmentSchema = z.object({
  establishmentType: z.enum(['store', 'club', 'servicing', 'range'], {
    required_error: 'Please select an establishment type',
  }),
  businessName: z.string().min(2, 'Business name is required'),
  location: z.string().min(5, 'Location is required'),
  phone: z.string().min(8, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  logoUrl: z.string().optional(),
})

type EstablishmentForm = z.infer<typeof establishmentSchema>

export default function CreateEstablishmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const form = useForm<EstablishmentForm>({
    resolver: zodResolver(establishmentSchema),
    defaultValues: {
      establishmentType: undefined,
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

        // For now, consider the user authorized
        // In a real scenario, you might want to check if they're in a specific authorized list
        if (mounted) {
          setIsAuthorized(true)
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
  }, [router, supabase, toast])

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
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
      const filePath = `establishments/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('establishments')
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
      } = supabase.storage.from('establishments').getPublicUrl(filePath)

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

  async function onSubmit(data: EstablishmentForm) {
    try {
      setIsLoading(true)

      // Get user session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Authentication error. Please log in again.')
      }

      // Create slug from business name
      const slug = data.businessName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')

      // Determine which table to insert into based on establishment type
      const tableName =
        data.establishmentType === 'store'
          ? 'stores'
          : data.establishmentType === 'club'
            ? 'clubs'
            : data.establishmentType === 'servicing'
              ? 'servicing'
              : 'ranges'

      // Insert new establishment
      const { error, data: newEstablishment } = await supabase
        .from(tableName)
        .insert({
          business_name: data.businessName,
          location: data.location,
          phone: data.phone,
          email: data.email,
          description: data.description,
          website: data.website || null,
          logo_url: data.logoUrl || null,
          owner_id: session.user.id,
          slug: slug,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Establishment created',
        description:
          'Your establishment profile has been created successfully.',
      })

      // Redirect to the appropriate establishment page
      router.push(`/establishments/${tableName}/${slug}`)
    } catch (error) {
      console.error('Create error:', error)
      toast({
        title: 'Creation failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
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
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to create an establishment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button>Return to Homepage</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <BackButton label="Back to Home" href="/" className="mb-6" />

        <Card>
          <CardHeader>
            <CardTitle>Create a New Establishment</CardTitle>
            <CardDescription>
              Add your firearms-related business to the MaltaGuns directory
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
                  name="establishmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Establishment Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select establishment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            value="store"
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" /> Store
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="club"
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" /> Club
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="servicing"
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" /> Servicing
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="range"
                            className="flex items-center gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" /> Range
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          placeholder="Describe your business and services"
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
                  {isLoading
                    ? 'Creating establishment...'
                    : 'Create Establishment'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
