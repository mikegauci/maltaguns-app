"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { EventCreditDialog } from "@/components/event-credit-dialog"

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

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateEventDialog({ open, onOpenChange, onSuccess }: CreateEventDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasCredits, setHasCredits] = useState(false)

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

  useEffect(() => {
    async function checkCredits() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        setUserId(session.user.id)

        // First, ensure the credits_events record exists
        const { error: upsertError } = await supabase
          .from("credits_events")
          .upsert({ 
            user_id: session.user.id,
            amount: 0
          })

        if (upsertError) {
          console.error("Error upserting credits:", upsertError)
          return
        }

        // Then fetch the credits
        const { data: credits } = await supabase
          .from("credits_events")
          .select("amount")
          .eq("user_id", session.user.id)
          .single()

        setHasCredits(Boolean(credits?.amount && credits.amount > 0))
      } catch (error) {
        console.error("Error checking credits:", error)
      }
    }

    if (open) {
      checkCredits()
    }
  }, [open])

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
    if (!hasCredits) {
      setShowCreditDialog(true)
      return
    }

    try {
      setIsLoading(true)

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

      // Deduct one event credit
      const { error: creditError } = await supabase
        .from("credits_events")
        .update({ 
          amount: hasCredits ? -1 : 0,
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

      onSuccess?.()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create event",
        description: error instanceof Error ? error.message : "Something went wrong"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Add a new event to the community calendar
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="space-y-4"
              style={{
                overflow: "scroll",
                height: "615px"
              }}
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
                        <Input type="email" placeholder="contact@example.com" {...field} />
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
                    <FormLabel>Price (Optional)</FormLabel>
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
                    <FormLabel>Event Poster (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handlePosterUpload}
                          disabled={uploadingPoster}
                        />
                        <Input type="hidden" {...field} />
                        {uploadingPoster && (
                          <p className="text-sm text-muted-foreground">
                            Uploading poster...
                          </p>
                        )}
                        {field.value && (
                          <img
                            src={field.value}
                            alt="Event poster preview"
                            className="w-full max-w-md rounded-lg"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sticky bottom-0 bg-background pt-4">
                <Button type="submit" className="w-full" disabled={isLoading || uploadingPoster}>
                  {isLoading ? "Creating event..." : "Create Event"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
    </>
  )
}