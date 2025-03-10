"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Mail, Phone, DollarSign } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

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
}

interface EventClientProps {
  event: Event
}

export default function EventClient({ event }: EventClientProps) {
  const router = useRouter()

  const formatTime = (time: string | null) => {
    if (!time) return null;
    return time.substring(0, 5); // Format HH:MM
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "Free";
    return new Intl.NumberFormat("en-MT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Link href="/events" className="text-primary hover:underline mb-6 inline-block">
          ← Back to events
        </Link>
        
        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          {/* Event Header */}
          <div className="p-6 border-b">
            <Badge className="mb-2">{event.type}</Badge>
            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>
                  {format(new Date(event.start_date), "MMMM d, yyyy")}
                  {event.end_date && ` - ${format(new Date(event.end_date), "MMMM d, yyyy")}`}
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
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{formatPrice(event.price)}</span>
                    </div>
                  </div>
                  
                  {event.phone && (
                    <div>
                      <h3 className="font-medium">Contact Phone</h3>
                      <div className="flex items-center mt-1">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <a href={`tel:${event.phone}`} className="text-primary hover:underline">
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
                        <a href={`mailto:${event.email}`} className="text-primary hover:underline">
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
      </div>
    </div>
  )
}