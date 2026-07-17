import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { HomeCarousel, HomeCarouselItem } from './HomeCarousel'

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

export const UpcomingEventsSection = ({
  events,
}: UpcomingEventsSectionProps) => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Upcoming Events</h2>
          <p className="text-base md:text-lg text-muted-foreground">
            Join upcoming community events and competitions - don't miss out!
          </p>
        </div>

        {events.length > 0 ? (
          <HomeCarousel>
            {events.slice(0, 10).map(event => (
              <HomeCarouselItem key={event.id}>
                <Link href={`/events/${event.id}`} className="block h-full">
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
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
                        <Calendar className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-2.5 md:p-4 text-center md:text-left">
                      <Badge className="mb-1.5 md:mb-2 text-[10px] md:text-xs">
                        {event.type}
                      </Badge>
                      <h3 className="font-semibold text-sm md:text-lg mb-1.5 md:mb-2 line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="flex items-center justify-center md:justify-start gap-2 text-xs md:text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                        <span>{format(new Date(event.start_date), 'PPP')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </HomeCarouselItem>
            ))}
          </HomeCarousel>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No upcoming events at the moment. Check back soon!
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link href="/events">
            <Button>View All Events</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
