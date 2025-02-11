"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Mail, Phone } from "lucide-react"
import { format } from "date-fns"

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
  created_by: string
}

interface EventClientProps {
  event: Event
}

export default function EventClient({ event }: EventClientProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/events')}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to events
          </Button>
        </div>

        <div className="space-y-8">
          {/* Event Header */}
          <div>
            <Badge className="mb-4">{event.type}</Badge>
            <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
            <p className="text-lg text-muted-foreground">
              Organized by {event.organizer}
            </p>
          </div>

          {/* Event Poster */}
          {event.poster_url && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={event.poster_url}
                alt={event.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Event Details */}
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Date and Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <span>
                    {format(new Date(event.start_date), 'PPP')}
                    {event.end_date && ` - ${format(new Date(event.end_date), 'PPP')}`}
                  </span>
                </div>
                {event.start_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>
                      {event.start_time}
                      {event.end_time && ` - ${event.end_time}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>{event.location}</span>
              </div>

              {/* Contact Information */}
              {(event.email || event.phone) && (
                <div className="space-y-2 pt-4 border-t">
                  {event.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <a
                        href={`mailto:${event.email}`}
                        className="text-primary hover:underline"
                      >
                        {event.email}
                      </a>
                    </div>
                  )}
                  {event.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <a
                        href={`tel:${event.phone}`}
                        className="text-primary hover:underline"
                      >
                        {event.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Price */}
              {event.price !== null && (
                <div className="pt-4 border-t">
                  <p className="text-lg font-semibold">
                    Price: €{event.price.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="pt-4 border-t">
                <h2 className="text-lg font-semibold mb-2">About this event</h2>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {event.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}