import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Event {
  id: string
  title: string
  type: string
  start_date: string
  poster_url: string | null
}

interface UpcomingEventsSectionProps {
  events: Event[]
}

export const UpcomingEventsSection = ({ events }: UpcomingEventsSectionProps) => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">Upcoming Events</h2>
          <p className="text-lg text-muted-foreground">
            Join upcoming community events and competitions - don't miss out!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.length > 0 ? (
            events.map(event => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {event.poster_url ? (
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={event.poster_url}
                        alt={event.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <Badge className="mb-2">{event.type}</Badge>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(event.start_date), 'PPP')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">
                No upcoming events at the moment. Check back soon!
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-center">
          <Link href="/events">
            <Button>View All Events</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

