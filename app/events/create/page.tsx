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
import { EventCreditDialog } from '@/components/dialogs/EventCreditDialog'
import { BackButton } from '@/components/ui/back-button'
import { Loader2 } from 'lucide-react'
import { Database } from '@/lib/database.types'

// Force dynamic rendering to avoid hydration issues
export const dynamic = 'force-dynamic'

const eventTypes = [
  'Course or Training',
  'Local Shooting Event',
  'International Trip',
  'Exhibition or Reenactment',
  'Airsoft Game',
  'Other',
] as const

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

// Helper function to check if a date is in the past
function isPastDate(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to start of day
  const checkDate = new Date(date)
  return checkDate < today
}

// Helper function to check if a date is more than 5 years in the future
function isTooFarInFuture(date: string) {
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 5)
  maxDate.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  return checkDate > maxDate
}

// Helper function to format today's date as YYYY-MM-DD
function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

// Helper function to format max date (5 years from now) as YYYY-MM-DD
function getMaxDateString() {
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 5)
  return maxDate.toISOString().split('T')[0]
}

// Add slugify function
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

const eventSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters'),
    organizer: z.string().min(2, 'Organizer name is required'),
    type: z.enum(eventTypes),
    startDate: z
      .string()
      .min(1, 'Start date is required')
      .refine(date => !isPastDate(date), {
        message: 'Start date cannot be in the past',
      })
      .refine(date => !isTooFarInFuture(date), {
        message: 'Start date cannot be more than 5 years in the future',
      }),
    endDate: z
      .string()
      .optional()
      .refine(
        date => {
          if (!date) return true // Allow empty/undefined
          return !isPastDate(date)
        },
        {
          message: 'End date cannot be in the past',
        }
      )
      .refine(
        date => {
          if (!date) return true // Allow empty/undefined
          return !isTooFarInFuture(date)
        },
        {
          message: 'End date cannot be more than 5 years in the future',
        }
      ),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    location: z.string().min(3, 'Location is required'),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    price: z.number().min(0, 'Price must be a positive number').optional(),
    posterUrl: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate end date is after start date
    if (data.endDate && data.startDate) {
      if (new Date(data.endDate) < new Date(data.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be after or equal to start date',
          path: ['endDate'],
        })
      }
    }

    // Validate end time is after start time on the same day
    if (data.endTime && data.startTime && data.startDate === data.endDate) {
      if (data.endTime < data.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be after start time when on the same day',
          path: ['endTime'],
        })
      }
    }
  })

type EventForm = z.infer<typeof eventSchema>

export default function CreateEventPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasCredits, setHasCredits] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
      try {
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

        if (mounted) {
          setUserId(session.user.id)

          // Check user credits
          const { data: creditsData, error: creditsError } = await supabase
            .from('credits_events')
            .select('amount')
            .eq('user_id', session.user.id)
            .single()

          if (creditsError && creditsError.code !== 'PGRST116') {
            console.error('Error fetching credits:', creditsError)
          }

          const currentCredits = creditsData?.amount || 0
          setCredits(currentCredits)
          setHasCredits(currentCredits > 0)

          // Show credit dialog if credits are 0
          if (currentCredits === 0) {
            setShowCreditDialog(true)
          }

          // Check URL parameters for Stripe success
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            const success = url.searchParams.get('success')
            const sessionId = url.searchParams.get('session_id')

            if (success === 'true' && sessionId) {
              toast({
                title: 'Payment successful!',
                description:
                  'Your event credit has been added to your account.',
              })

              url.searchParams.delete('success')
              url.searchParams.delete('session_id')
              window.history.replaceState({}, '', url.toString())
            }
          }

          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error in session initialization:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeSession()

    return () => {
      mounted = false
    }
  }, [router, supabase, toast])

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      organizer: '',
      type: 'Other',
      startDate: '',
      location: '',
    },
  })

  async function handlePosterUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Image must be less than 5MB',
        })
        return
      }

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload a valid image file (JPEG, PNG, or WebP)',
        })
        return
      }

      setUploadingPoster(true)
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

      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `events/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('events').getPublicUrl(filePath)

      setPosterUrl(publicUrl)
      form.setValue('posterUrl', publicUrl)

      toast({
        title: 'Poster uploaded',
        description: 'Your event poster has been uploaded successfully',
      })
    } catch (error) {
      console.error('Poster upload error:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload poster',
      })
    } finally {
      setUploadingPoster(false)
    }
  }

  async function onSubmit(data: EventForm) {
    try {
      setIsSubmitting(true)
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

      // Generate slug from title
      const slug = slugify(data.title)

      // Create the event with correct column names
      const { error: eventError } = await supabase
        .from('events')
        .insert({
          title: data.title,
          description: data.description,
          organizer: data.organizer,
          type: data.type,
          start_date: data.startDate,
          end_date: data.endDate || null,
          start_time: data.startTime || null,
          end_time: data.endTime || null,
          location: data.location,
          phone: data.phone || null,
          email: data.email || null,
          price: data.price || null,
          poster_url: posterUrl || null,
          created_by: session.user.id,
          slug: slug,
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Deduct one credit
      const { error: creditError } = await supabase
        .from('credits_events')
        .update({
          amount: credits - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)

      if (creditError) {
        console.error('Error updating credits:', creditError)
        throw creditError
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from('event_credit_transactions')
        .insert({
          user_id: session.user.id,
          amount: -1,
          type: 'event_creation',
        })

      if (transactionError) {
        console.error('Error recording transaction:', transactionError)
      }

      setCredits(credits - 1)
      setHasCredits(credits - 1 > 0)

      toast({
        title: 'Event created',
        description: 'Your event has been created successfully',
      })

      // Keep isSubmitting true during redirection
      // Redirect to the slug instead of ID
      router.push(`/events/${slug}`)
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        variant: 'destructive',
        title: 'Failed to create event',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
      })
      // Only reset isSubmitting on error
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Show only the credit dialog if credits are 0
  if (!hasCredits) {
    return (
      <div className="min-h-screen bg-background">
        {userId && (
          <EventCreditDialog
            open={showCreditDialog}
            onOpenChange={setShowCreditDialog}
            userId={userId}
            onSuccess={() => {
              setShowCreditDialog(false)
              setHasCredits(true)
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <BackButton label="Back to events" href="/events" />
          <div className="flex items-center gap-2">
            <div className="bg-muted px-4 py-2 rounded-md">
              <span className="text-sm text-muted-foreground">
                Event Credits remaining:
              </span>
              <span className="font-semibold ml-1">{credits}</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Event</CardTitle>
            <CardDescription>
              Add a new event to the community calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide event details"
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
                  name="organizer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organizer / Club Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter organizer name" {...field} />
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
                      <FormLabel>Event Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={getTodayString()}
                            max={getMaxDateString()}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={form.watch('startDate') || getTodayString()}
                            max={getMaxDateString()}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event location" {...field} />
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
                        <FormLabel>Phone Number (Optional)</FormLabel>
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
                        <FormLabel>Email Address (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="info@maltaguns.com"
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
                  name="price"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Price (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          onChange={e =>
                            onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="posterUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poster Image</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePosterUpload}
                            disabled={uploadingPoster}
                            className="hidden"
                            id="poster-upload"
                          />
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor="poster-upload"
                              className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium"
                            >
                              {uploadingPoster
                                ? 'Uploading...'
                                : 'Upload Poster'}
                            </label>
                            {field.value && (
                              <span className="text-sm text-muted-foreground">
                                Poster uploaded
                              </span>
                            )}
                          </div>
                          {field.value && (
                            <div className="relative w-40 h-40 mt-2">
                              <img
                                src={field.value}
                                alt="Event poster"
                                className="w-full h-full object-cover rounded-md"
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSubmitting || uploadingPoster || !hasCredits}
                >
                  {isSubmitting || uploadingPoster ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadingPoster ? 'Uploading Poster...' : 'Creating...'}
                    </>
                  ) : !hasCredits ? (
                    'Insufficient Credits'
                  ) : (
                    'Create Event'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
