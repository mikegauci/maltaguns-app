'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Mail,
  Phone,
  Coins,
  Pencil,
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { BackButton } from '@/components/ui/back-button'
import { PageLayout } from '@/components/ui/page-layout'

interface Event {
  id: string
  title: string
  description: string
  organizer: string
  type: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  location: string
  phone: string | null
  email: string | null
  price: number | null
  poster_url: string | null
  slug: string | null
  created_by: string
}

interface EventClientProps {
  event: Event
}

export default function EventClient({ event }: EventClientProps) {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    // Function to update owner status based on session
    const updateOwnerStatus = (
      session: import('@supabase/supabase-js').Session | null
    ) => {
      console.log('=== DEBUG UPDATE OWNER STATUS ===')
      console.log('Session user ID:', session?.user?.id)
      console.log('Event created_by:', event.created_by)
      console.log('Event object:', event)

      if (session?.user?.id) {
        setCurrentUserId(session.user.id)
        const isUserOwner = session.user.id === event.created_by
        console.log('Is owner?', isUserOwner)
      } else {
        setCurrentUserId(null)
        console.log('Is owner? false (no session or user ID)')
      }
    }

    // Attempt to get the session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial getSession() call result:', session)
      updateOwnerStatus(session)
    })

    // Listen for auth state changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed. Event:', _event, 'New session:', session)
      updateOwnerStatus(session)
    })

    // Cleanup subscription on component unmount
    return () => {
      authSubscription?.unsubscribe()
    }
  }, [event])

  const formatTime = (time: string | null) => {
    if (!time) return null
    return time.substring(0, 5) // Format HH:MM
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return 'Free'
    return new Intl.NumberFormat('en-MT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  return (
    <PageLayout>
      <BackButton
        label="Back"
        href="/events"
        className="mb-6"
        hideLabelOnMobile={false}
      />

      <div className="bg-card rounded-lg shadow-md overflow-hidden">
        {/* Event Header */}
        <div className="p-6 border-b flex justify-between items-start">
          <div>
            <Badge className="mb-2">{event.type}</Badge>
            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>
                  {format(new Date(event.start_date), 'MMMM d, yyyy')}
                  {event.end_date &&
                    ` - ${format(new Date(event.end_date), 'MMMM d, yyyy')}`}
                </span>
              </div>
              {event.start_time && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>
                    {formatTime(event.start_time)}
                    {event.end_time && ` - ${formatTime(event.end_time)}`}
                  </span>
                </div>
              )}
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>

          {/* Always show edit button if user matches, similar to profile page */}
          {currentUserId && currentUserId === event.created_by && (
            <Button
              onClick={() =>
                router.push(`/events/${event.slug || event.id}/edit`)
              }
              className="flex items-center"
              variant="outline"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Event
            </Button>
          )}
        </div>

        {/* Event Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Organizer</h2>
              <p>{event.organizer}</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">About this event</h2>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{event.description}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-muted p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Event Details</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Price</h3>
                  <div className="flex items-center mt-1">
                    <Coins className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatPrice(event.price)}</span>
                  </div>
                </div>

                {event.phone && (
                  <div>
                    <h3 className="font-medium">Contact Phone</h3>
                    <div className="flex items-center mt-1">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a
                        href={`tel:${event.phone}`}
                        className="text-primary hover:underline"
                      >
                        {event.phone}
                      </a>
                    </div>
                  </div>
                )}

                {event.email && (
                  <div>
                    <h3 className="font-medium">Contact Email</h3>
                    <div className="flex items-center mt-1">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a
                        href={`mailto:${event.email}`}
                        className="text-primary hover:underline"
                      >
                        {event.email}
                      </a>
                    </div>
                  </div>
                )}

                {event.poster_url && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Event Poster</h3>
                    <img
                      src={event.poster_url}
                      alt={`${event.title} poster`}
                      className="w-full rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
