"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { EventCreditDialog } from "@/components/event-credit-dialog"
import { ArrowLeft, Loader2 } from "lucide-react"

// Force dynamic rendering to avoid hydration issues
export const dynamic = "force-dynamic";

const eventTypes = [
  "Course or Training",
  "Local Shooting Event",
  "International Trip",
  "Exhibition or Reenactment",
  "Airsoft Game",
  "Other"
] as const

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  organizer: z.string().min(2, "Organizer name is required"),
  type: z.enum(eventTypes),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(3, "Location is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  price: z.number().min(0, "Price must be a positive number").optional(),
  posterUrl: z.string().optional()
})

type EventForm = z.infer<typeof eventSchema>

export default function CreateEventPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasCredits, setHasCredits] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Set isMounted to true when component mounts
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Check for success parameter in URL (after Stripe redirect)
  useEffect(() => {
    // Only run if we're in the browser
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location.href)
    const success = url.searchParams.get('success')
    const sessionId = url.searchParams.get('session_id')
    
    if (success === 'true' && sessionId) {
      // Show success toast
      toast({
        title: "Payment successful!",
        description: "Your event credit has been added to your account.",
      })
      
      // Remove the query parameters from the URL
      url.searchParams.delete('success')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
      
      // Force refresh credits
      checkCredits(true)
    }
  }, [])

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      organizer: "",
      type: "Other",
      startDate: "",
      location: "",
    }
  })

  async function checkCredits(forceRefresh = false) {
    try {
      // Only run if we're in the browser
      if (typeof window === 'undefined') return;
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push("/login")
        return
      }

      setUserId(session.user.id)

      if (forceRefresh) {
        console.log("Force refreshing credits")
      }

      // Direct query to get credits from the database
      // This bypasses any potential caching issues
      const { data, error } = await supabase.rpc('get_user_credits', {
        user_id_param: session.user.id
      })
      
      if (error) {
        console.error("Error fetching credits:", error)
        
        // Fallback to the old method if RPC fails
        const { data: userCredits, error: creditsError } = await supabase
          .from("credits_events")
          .select("amount")
          .eq("user_id", session.user.id)
          .single()
          
        if (creditsError) {
          console.error("Error fetching event credits:", creditsError)
          
          // Try to create the record if it doesn't exist
          if (creditsError.code === 'PGRST116') { // Record not found
            console.log("No event credits record found, creating one")
            const { error: insertError } = await supabase
              .from("credits_events")
              .insert({ 
                user_id: session.user.id,
                amount: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              
            if (insertError) {
              console.error("Error creating event credits record:", insertError)
            } else {
              console.log("Created event credits record")
            }
          }
          
          // Set credits to 0 if we couldn't fetch them
          setCredits(0)
          setHasCredits(false)
          
          // Show credit dialog if no credits
          if (!forceRefresh && isMounted) {
            setShowCreditDialog(true)
          }
        } else {
          const creditAmount = userCredits?.amount || 0
          console.log("Found event credits (fallback method):", creditAmount)
          setCredits(creditAmount)
          setHasCredits(creditAmount > 0)
          
          // Only show credit dialog if mounted and no credits
          if (creditAmount === 0 && !forceRefresh && isMounted) {
            setShowCreditDialog(true)
          }
        }
      } else {
        // Successfully got credits from RPC
        if (data && data.length > 0) {
          const eventCredits = data[0].event_credits || 0
          console.log("Found event credits (RPC method):", eventCredits)
          setCredits(eventCredits)
          setHasCredits(eventCredits > 0)
          
          // Only show credit dialog if mounted and no credits
          if (eventCredits === 0 && !forceRefresh && isMounted) {
            setShowCreditDialog(true)
          }
        } else {
          console.log("No credits data returned from RPC")
          setCredits(0)
          setHasCredits(false)
          
          // Show credit dialog if no credits
          if (!forceRefresh && isMounted) {
            setShowCreditDialog(true)
          }
        }
      }
    } catch (error) {
      console.error("Error checking credits:", error)
    }
  }

  useEffect(() => {
    // Only run checkCredits after component is mounted
    if (isMounted) {
      checkCredits()
    }
  }, [isMounted, router])

  async function handlePosterUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Poster image must be under 5MB",
        })
        return
      }

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload an image file (JPEG/PNG/WebP)",
        })
        return
      }

      setUploadingPoster(true)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${sessionData.session.user.id}-${Date.now()}.${fileExt}`
      const filePath = `events/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath)

      form.setValue('posterUrl', publicUrl)

      toast({
        title: "Poster uploaded",
        description: "Your event poster has been uploaded successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload poster",
      })
    } finally {
      setUploadingPoster(false)
    }
  }

  async function onSubmit(data: EventForm) {
    try {
      setIsSubmitting(true);
      
      // Check credits again to make sure user still has enough
      await checkCredits(true)
      
      if (credits < 1) {
        setShowCreditDialog(true)
        setIsSubmitting(false);
        return
      }

      setIsLoading(true)

      // Authenticate user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user.id) {
        throw new Error("Not authenticated")
      }

      // Create the event
      const { error: eventError } = await supabase
        .from("events")
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
          poster_url: data.posterUrl || null,
          created_by: session.user.id
        })

      if (eventError) throw eventError

      // Get the event ID
      const { data: eventData, error: fetchError } = await supabase
        .from("events")
        .select("id")
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (fetchError) throw fetchError
      
      const eventId = eventData.id

      // Deduct one event credit
      const { error: creditError } = await supabase
        .from("credits_events")
        .update({ 
          amount: credits - 1,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", session.user.id)

      if (creditError) throw creditError

      // Record the transaction
      await supabase
        .from("credit_transactions")
        .insert({
          user_id: session.user.id,
          amount: -1,
          type: "event_creation"
        })

      toast({
        title: "Event created",
        description: "Your event has been created successfully"
      })

      router.push("/events")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create event",
        description: error instanceof Error ? error.message : "Something went wrong"
      })
    } finally {
      setIsLoading(false)
      setIsSubmitting(false)
    }
  }

  // Function to force refresh credits
  const forceRefreshCredits = async () => {
    setRefreshing(true)
    try {
      await checkCredits(true)
      toast({
        title: "Credits refreshed",
        description: "Your event credits have been refreshed.",
      })
    } catch (error) {
      console.error("Error refreshing credits:", error)
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: "Failed to refresh your event credits. Please try again.",
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/events")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to events
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Event Credits remaining:</span>
            <span className="font-semibold">{credits}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceRefreshCredits} 
              disabled={refreshing}
              className="ml-2 h-7 px-2"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventTypes.map((type) => (
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
                          <Input type="date" {...field} />
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
                          <Input type="date" {...field} />
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
                          <Input type="tel" placeholder="+356 1234 5678" {...field} />
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
                          <Input type="email" placeholder="info@maltaguns.com" {...field} />
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
                          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                              {uploadingPoster ? "Uploading..." : "Upload Poster"}
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
                  className="w-full" 
                  disabled={isSubmitting || uploadingPoster}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Event"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Only render dialog when component is mounted and suppress hydration warnings */}
        {isMounted && userId && (
          <div suppressHydrationWarning>
            <EventCreditDialog
              open={showCreditDialog}
              onOpenChange={setShowCreditDialog}
              userId={userId}
              onSuccess={() => {
                setShowCreditDialog(false)
                setHasCredits(true)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}