'use client'

import { useEffect, useState } from 'react'
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
import { Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react'
import { Database } from '@/lib/database.types'
import { BackButton } from '@/components/ui/back-button'
import { DeleteConfirmationDialog } from '@/components/dialogs'
import { format } from 'date-fns'
import { PageLayout } from '@/components/ui/page-layout'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

const eventSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }),
  description: z
    .string()
    .min(10, { message: 'Description must be at least 10 characters' }),
  organizer: z.string().min(1, { message: 'Organizer is required' }),
  type: z.string().min(1, { message: 'Event type is required' }),
  start_date: z.string().min(1, { message: 'Start date is required' }),
  end_date: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  location: z.string().min(1, { message: 'Location is required' }),
  phone: z.string().nullable(),
  email: z
    .string()
    .email({ message: 'Invalid email address' })
    .nullable()
    .or(z.literal('')),
  price: z.coerce.number().nullable(),
})

type EventForm = z.infer<typeof eventSchema>

export default function EditEvent({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [eventId, setEventId] = useState<string | null>(null)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [newPoster, setNewPoster] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      organizer: '',
      type: '',
      start_date: '',
      end_date: null,
      start_time: null,
      end_time: null,
      location: '',
      phone: null,
      email: null,
      price: null,
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

        // First try to find by slug
        let { data: event, error } = await supabase
          .from('events')
          .select('*')
          .eq('slug', params.slug)
          .single()

        // If not found by slug, try by ID for backward compatibility
        if (error || !event) {
          const { data: eventById, error: errorById } = await supabase
            .from('events')
            .select('*')
            .eq('id', params.slug)
            .single()

          if (errorById || !eventById) {
            console.error('Error fetching event:', errorById)
            toast({
              title: 'Event not found',
              description: "The event you're trying to edit doesn't exist.",
              variant: 'destructive',
            })
            router.push('/events')
            return
          }

          event = eventById
        }

        // Check if user is the owner
        if (event.created_by !== session.user.id) {
          toast({
            title: 'Unauthorized',
            description: "You don't have permission to edit this event.",
            variant: 'destructive',
          })
          router.push(`/events/${event.slug || event.id}`)
          return
        }

        if (mounted) {
          setEventId(event.id)
          setPosterUrl(event.poster_url)
          setIsAuthorized(true)

          if (event.poster_url) {
            setPosterPreview(event.poster_url)
          }

          // Format dates for the form
          form.reset({
            title: event.title,
            description: event.description,
            organizer: event.organizer,
            type: event.type,
            start_date: format(new Date(event.start_date), 'yyyy-MM-dd'),
            end_date: event.end_date
              ? format(new Date(event.end_date), 'yyyy-MM-dd')
              : null,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            phone: event.phone,
            email: event.email,
            price: event.price,
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

  async function handlePosterUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    if (!file) return

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

    setNewPoster(file)
    setPosterPreview(URL.createObjectURL(file))
  }

  function handleRemovePoster() {
    setNewPoster(null)
    setPosterPreview(null)
    setPosterUrl(null)
  }

  async function onSubmit(data: EventForm) {
    if (!eventId) {
      toast({
        title: 'Error',
        description: 'Event information is missing.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

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

      let finalPosterUrl = posterUrl

      // 1. Upload new poster if provided
      if (newPoster) {
        setUploadProgress(10)
        const fileExt = newPoster.name.split('.').pop()
        const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `events/${eventId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('events')
          .upload(filePath, newPoster, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        const { data: urlData } = supabase.storage
          .from('events')
          .getPublicUrl(filePath)
        finalPosterUrl = urlData.publicUrl
        setUploadProgress(50)
      } else {
        setUploadProgress(50)
      }

      // 2. Delete old poster if it was replaced or removed
      if (posterUrl && (newPoster || !posterPreview)) {
        // Extract the path from the URL
        const urlParts = posterUrl.split('/')
        const bucketIndex = urlParts.findIndex(part => part === 'events')
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          const path = urlParts.slice(bucketIndex + 1).join('/')
          const { error: deleteError } = await supabase.storage
            .from('events')
            .remove([path])

          if (deleteError) {
            console.error('Delete error:', deleteError)
            // Continue with update even if delete fails
          }
        }
      }

      // 3. Update the event in the database
      setUploadProgress(75)
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: data.title,
          description: data.description,
          organizer: data.organizer,
          type: data.type,
          start_date: data.start_date,
          end_date: data.end_date,
          start_time: data.start_time,
          end_time: data.end_time,
          location: data.location,
          phone: data.phone || null,
          email: data.email || null,
          price: data.price,
          poster_url: finalPosterUrl,
          updated_at: new Date().toISOString(),
          slug: slugify(data.title),
        })
        .eq('id', eventId)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      setUploadProgress(100)

      toast({
        title: 'Event updated',
        description: 'Your event has been updated successfully.',
      })

      // Generate a new slug from the title if different
      const newSlug = slugify(data.title)
      router.push(`/events/${newSlug}`)
      router.refresh()
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update event. Please try again.',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleDeleteEvent() {
    if (!eventId) {
      toast({
        title: 'Error',
        description: 'Event information is missing.',
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

      // 1. Delete poster if exists
      if (posterUrl) {
        const urlParts = posterUrl.split('/')
        const bucketIndex = urlParts.findIndex(part => part === 'events')
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          const path = urlParts.slice(bucketIndex + 1).join('/')
          const { error: deleteError } = await supabase.storage
            .from('events')
            .remove([path])

          if (deleteError) {
            console.error('Delete error:', deleteError)
            // Continue with deletion even if poster delete fails
          }
        }
      }

      // 2. Delete event from database
      const { error } = await supabase.from('events').delete().eq('id', eventId)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      toast({
        title: 'Event deleted',
        description: 'Your event has been deleted successfully.',
      })

      router.push('/events')
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete event. Please try again or contact support if the issue persists.',
      })
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <PageLayout centered>
        <p className="text-muted-foreground">Loading...</p>
      </PageLayout>
    )
  }

  if (!isAuthorized) {
    return null // Component will redirect in useEffect
  }

  return (
    <PageLayout containerSize="sm" padding="md">
      <div className="mb-6 flex items-center justify-between">
        <BackButton
          label="Back to event"
          href={`/events/${params.slug}`}
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
          Delete Event
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Event</CardTitle>
          <CardDescription>Update your event information</CardDescription>
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
                        Event Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter event title"
                          className="h-10"
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Event Type
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Competition, Training, International Trip"
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
                  name="organizer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Organizer
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter organizer name"
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
                          placeholder="Describe your event in detail"
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
                <div>
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Start Date
                        </FormLabel>
                        <FormControl>
                          <Input type="date" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          End Date (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-10"
                            {...field}
                            value={field.value || ''}
                            onChange={e =>
                              field.onChange(e.target.value || null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          Start Time (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="h-10"
                            {...field}
                            value={field.value || ''}
                            onChange={e =>
                              field.onChange(e.target.value || null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          End Time (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            className="h-10"
                            {...field}
                            value={field.value || ''}
                            onChange={e =>
                              field.onChange(e.target.value || null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-1">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Location
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter event location"
                          className="h-10"
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Contact Phone (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contact phone number"
                          className="h-10"
                          {...field}
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value || null)}
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
                      <FormLabel className="text-base font-medium">
                        Contact Email (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Contact email address"
                          className="h-10"
                          {...field}
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value || null)}
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
                        Price (€) (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="h-10"
                          {...field}
                          value={field.value === null ? '' : field.value}
                          onChange={e =>
                            field.onChange(
                              e.target.value === ''
                                ? null
                                : parseFloat(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel className="text-base font-medium">
                    Event Poster (optional)
                  </FormLabel>

                  <div className="mt-2">
                    {posterPreview ? (
                      <div className="relative rounded-md overflow-hidden border shadow-sm w-full aspect-[3/2]">
                        <img
                          src={posterPreview}
                          alt="Event poster preview"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full shadow-md"
                          onClick={handleRemovePoster}
                          disabled={isUploading}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer aspect-[3/2] hover:bg-muted/50 transition-colors">
                        <span className="text-3xl mb-1">+</span>
                        <span className="text-sm text-center text-muted-foreground px-2">
                          Add Poster
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePosterUpload}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>
                </div>
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
                  {isUploading ? 'Updating...' : 'Update Event'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        onConfirm={handleDeleteEvent}
        confirmLabel="Delete Event"
      />
    </PageLayout>
  )
}
