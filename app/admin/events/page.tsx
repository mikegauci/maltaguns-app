'use client'

import { useState, useEffect, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, FormDialog, ConfirmDialog, ActionCell } from '@/app/admin'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BackButton } from '@/components/ui/back-button'
import dynamic from 'next/dynamic'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

interface Event {
  id: string
  title: string
  description: string
  organizer: string
  type: string
  start_date: string
  end_date: string | null
  start_time: string
  end_time: string
  location: string
  phone: string
  email: string
  price: string | null
  poster_url: string | null
  created_by: string
  created_at: string
  updated_at: string
  slug: string
  creator?: {
    username: string
    email: string
  }
}

// Use dynamic import with SSR disabled to prevent hydration issues
const EventsPageContent = dynamic(() => Promise.resolve(EventsPageComponent), {
  ssr: false,
})

export default function EventsPage() {
  return <EventsPageContent />
}

function EventsPageComponent() {
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    organizer: '',
    type: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    start_time: '',
    end_time: '',
    location: '',
    phone: '',
    email: '',
    price: '',
  })
  const supabase = createClientComponentClient()

  const columns: ColumnDef<Event>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      enableSorting: true,
    },
    {
      accessorKey: 'organizer',
      header: 'Organizer',
      enableSorting: true,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: true,
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('start_date') as string
        return date ? format(new Date(date), 'dd MMM yyyy') : 'N/A'
      },
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('end_date') as string | null
        return date ? format(new Date(date), 'dd MMM yyyy') : 'N/A'
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
      enableSorting: true,
    },
    {
      accessorKey: 'price',
      header: 'Price (€)',
      enableSorting: true,
      cell: ({ row }) => {
        const price = row.getValue('price') as string | null
        return price || 'Free'
      },
    },
    {
      accessorKey: 'poster_url',
      header: 'Poster',
      enableSorting: false,
      cell: ({ row }) => {
        const posterUrl = row.getValue('poster_url') as string | null
        return posterUrl ? (
          <img
            src={posterUrl}
            alt="Poster"
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          'No image'
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const event = row.original
        return (
          <ActionCell
            onEdit={() => handleEdit(event)}
            onDelete={() => handleDelete(event)}
            onView={() => window.open(`/events/${event.slug}`, '_blank')}
          />
        )
      },
    },
  ]

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)

      // First check if we have a valid session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Failed to get session')
      }

      if (!session) {
        console.error('No session found')
        throw new Error('No active session')
      }

      // Fetch events with creator information
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          creator:created_by(username, email)
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch events error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw error
      }

      if (!data) {
        console.error('No data returned from events query')
        throw new Error('No data returned from events query')
      }

      console.log('Successfully fetched events:', {
        count: data.length,
        firstEvent: data[0],
      })

      setEvents(data)
    } catch (error) {
      console.error('Error in fetchEvents:', error)
      toast({
        variant: 'destructive',
        title: 'Error fetching events',
        description:
          error instanceof Error
            ? `${error.message}. Please check console for more details.`
            : 'Failed to fetch events. Please check console for more details.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  function handleEdit(event: Event) {
    setSelectedEvent(event)
    setFormData({
      title: event.title,
      description: event.description,
      organizer: event.organizer,
      type: event.type,
      start_date: event.start_date ? parseISO(event.start_date) : null,
      end_date: event.end_date ? parseISO(event.end_date) : null,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      phone: event.phone,
      email: event.email,
      price: event.price || '',
    })
    setIsEditDialogOpen(true)
  }

  function handleDelete(event: Event) {
    setSelectedEvent(event)
    setIsDeleteDialogOpen(true)
  }

  async function handleEditSubmit() {
    if (!selectedEvent) return

    try {
      setIsSubmitting(true)

      // Update event
      const { error } = await supabase
        .from('events')
        .update({
          title: formData.title,
          description: formData.description,
          organizer: formData.organizer,
          type: formData.type,
          start_date: formData.start_date
            ? formData.start_date.toISOString().split('T')[0]
            : null,
          end_date: formData.end_date
            ? formData.end_date.toISOString().split('T')[0]
            : null,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: formData.location,
          phone: formData.phone,
          email: formData.email,
          price: formData.price || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEvent.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Event updated successfully',
      })

      setIsEditDialogOpen(false)
      fetchEvents()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update event',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSubmit() {
    if (!selectedEvent) return

    try {
      setIsSubmitting(true)

      // Use admin delete API route
      const response = await fetch('/api/admin/events/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete event')
      }

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      })

      setIsDeleteDialogOpen(false)
      fetchEvents()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete event',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <PageHeader title="Event Management" description="Manage events" />
      <BackButton label="Back to Dashboard" href="/admin" />

      <DataTable
        columns={columns}
        data={isLoading ? [] : events}
        searchKey="title"
        searchPlaceholder="Search events..."
      />
      {isLoading && (
        <div className="w-full flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Edit Event Dialog */}
      <FormDialog
        title="Edit Event"
        description="Update event information"
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Update"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={e =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-organizer">Organizer</Label>
              <Input
                id="edit-organizer"
                value={formData.organizer}
                onChange={e =>
                  setFormData({ ...formData, organizer: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Event Type</Label>
              <Input
                id="edit-type"
                value={formData.type}
                onChange={e =>
                  setFormData({ ...formData, type: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-start-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.start_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? (
                      format(formData.start_date, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date || undefined}
                    onSelect={date =>
                      setFormData({ ...formData, start_date: date || null })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-end-date">End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-end-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.end_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? (
                      format(formData.end_date, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.end_date || undefined}
                    onSelect={date =>
                      setFormData({ ...formData, end_date: date || null })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-time">Start Time</Label>
              <Input
                id="edit-start-time"
                type="time"
                value={formData.start_time}
                onChange={e =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-end-time">End Time</Label>
              <Input
                id="edit-end-time"
                type="time"
                value={formData.end_time}
                onChange={e =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={formData.location}
              onChange={e =>
                setFormData({ ...formData, location: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={e =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-price">Price (€) (Optional)</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={e =>
                setFormData({ ...formData, price: e.target.value })
              }
              placeholder="Leave empty for free events"
            />
          </div>
        </div>
      </FormDialog>

      {/* Delete Event Confirmation */}
      <ConfirmDialog
        title="Delete Event"
        description={`Are you sure you want to delete "${selectedEvent?.title}"? This action cannot be undone.`}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSubmit}
        isLoading={isSubmitting}
        confirmLabel="Delete"
        variant="destructive"
      />
    </PageLayout>
  )
}
