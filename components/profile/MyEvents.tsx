'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Eye, Pencil, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { Event } from '../../app/profile/types'

interface MyEventsProps {
  events: Event[]
  eventCredits: number
  handleDeleteEvent: (eventId: string) => Promise<void> // eslint-disable-line unused-imports/no-unused-vars
  setShowEventCreditDialog: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
}

export const MyEvents = ({
  events,
  eventCredits,
  handleDeleteEvent,
  setShowEventCreditDialog,
}: MyEventsProps) => {
  if (events.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>My Events</CardTitle>
          <CardDescription>Manage your published events</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="bg-muted px-4 py-2 rounded-md text-center sm:text-left">
              <span className="text-sm text-muted-foreground">
                Credits Remaining:
              </span>
              <span className="font-semibold ml-1">{eventCredits}</span>
            </div>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setShowEventCreditDialog(true)}
            >
              Add more credits
            </Button>
          </div>
          <Link href="/events/create" className="sm:ml-auto">
            <Button className="bg-black text-white hover:bg-gray-800 w-full">
              <Calendar className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map(event => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <div className="flex flex-col space-y-4">
                  <div className="flex gap-3">
                    {event.poster_url ? (
                      <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={event.poster_url}
                          alt={event.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <div className="text-sm text-muted-foreground">
                        <p>{format(new Date(event.start_date), 'PPP')}</p>
                        <p>{event.location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/events/${event.slug || event.id}`}
                      className="w-full sm:w-auto"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    <Link
                      href={`/events/${event.slug || event.id}/edit`}
                      className="w-full sm:w-auto"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200 w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
