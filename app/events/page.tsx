'use client'

import { useEffect, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { format, addMonths, subMonths, isBefore, startOfDay } from 'date-fns'

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
  poster_url: string | null
  price: number | null
  slug: string | null
}

export default function EventsPage() {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([])

  useEffect(() => {
    async function fetchEvents() {
      const today = new Date().toISOString().split('T')[0]

      // Fetch upcoming events
      const { data: upcoming } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(10)

      // Fetch past events
      const { data: past } = await supabase
        .from('events')
        .select('*')
        .lt('start_date', today)
        .order('start_date', { ascending: false })
        .limit(6)

      if (upcoming) setUpcomingEvents(upcoming)
      if (past) setPastEvents(past)
    }

    fetchEvents()
  }, [])

  useEffect(() => {
    // Fetch events for the selected month
    async function fetchCalendarEvents() {
      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      )
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      )

      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', startOfMonth.toISOString())
        .lte('start_date', endOfMonth.toISOString())

      if (data) setCalendarEvents(data)
    }

    fetchCalendarEvents()
  }, [currentMonth])

  function getDayEvents(date: Date) {
    return calendarEvents.filter(
      event => new Date(event.start_date).toDateString() === date.toDateString()
    )
  }

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  function truncateTitle(title: string, maxLength: number = 25) {
    return title.length > maxLength
      ? title.substring(0, maxLength) + '...'
      : title
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Calendar of Events</h1>
          <p className="text-muted-foreground">
            Discover and participate in the latest firearms community events
          </p>
        </div>

        {/* Upcoming Events Carousel */}
        {upcomingEvents.length > 0 && (
          <Carousel className="w-full">
            <CarouselContent>
              {upcomingEvents.map(event => (
                <CarouselItem
                  key={event.id}
                  className="md:basis-1/2 lg:basis-1/3"
                >
                  <Link href={`/events/${event.slug || event.id}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      {event.poster_url && (
                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                          <img
                            src={event.poster_url}
                            alt={event.title}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <Badge className="mb-2">{event.type}</Badge>
                        <h3 className="font-semibold text-lg mb-2">
                          {event.title}
                        </h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                              {format(new Date(event.start_date), 'PPP')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                          {event.start_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{event.start_time}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        )}

        {/* Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-card rounded-lg border shadow">
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">
                    {format(currentMonth, 'MMMM')}{' '}
                    {format(currentMonth, 'yyyy')}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => date && setSelectedDate(date)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="w-full p-0"
                weekStartsOn={1}
                classNames={{
                  months: 'w-full',
                  month: 'w-full space-y-4',
                  caption: 'hidden',
                  table: 'w-full border-collapse border border-border',
                  head_row: 'flex w-full',
                  head_cell:
                    'text-muted-foreground flex-1 font-normal text-[0.8rem] py-2 border-b border-r last:border-r-0 w-[calc(100%/7)] [&:nth-child(6)]:text-orange-600 [&:nth-child(7)]:text-orange-600',
                  row: 'flex w-full mt-0',
                  cell: 'relative flex-1 h-[120px] p-0 text-center border-r last:border-r-0 border-b last-of-type:border-b-0 hover:bg-accent/50 hover:text-accent-foreground focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md w-[calc(100%/7)] [&:nth-child(6)]:bg-orange-50 [&:nth-child(7)]:bg-orange-50 dark:[&:nth-child(6)]:bg-orange-950/20 dark:[&:nth-child(7)]:bg-orange-950/20 [&:has(.today)]:hover:bg-primary/90 [&:has(.today)]:hover:text-primary-foreground',
                  day: 'h-full w-full p-2 font-normal aria-selected:opacity-100',
                  day_today:
                    'bg-primary text-primary-foreground rounded-md today',
                  day_outside: 'text-muted-foreground opacity-50',
                  day_disabled: 'text-muted-foreground opacity-50',
                  day_range_middle:
                    'aria-selected:bg-accent aria-selected:text-accent-foreground',
                  day_hidden: 'invisible',
                  day_selected: 'text-foreground font-bold !important',
                }}
                components={{
                  DayContent: ({ date }) => {
                    const events = getDayEvents(date)
                    const isToday =
                      date.toDateString() === new Date().toDateString()
                    const isPast = isBefore(
                      startOfDay(date),
                      startOfDay(new Date())
                    )
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6

                    return (
                      <div className="w-full h-full flex flex-col">
                        <span
                          className={`text-sm p-1 rounded-md ${
                            isToday
                              ? 'font-bold text-primary-foreground'
                              : isWeekend
                                ? 'text-orange-600 font-medium'
                                : 'text-foreground'
                          }`}
                        >
                          {date.getDate()}
                          {isToday && (
                            <span className="ml-1 text-[0.7rem]">Today</span>
                          )}
                        </span>
                        <div className="flex flex-col gap-1 mt-1">
                          {events.map(event => (
                            <Link
                              key={event.id}
                              href={`/events/${event.slug || event.id}`}
                              className="block"
                            >
                              <div
                                className={`text-xs p-1 rounded ${
                                  isPast
                                    ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    : isWeekend
                                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50'
                                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                                } truncate transition-colors`}
                              >
                                {truncateTitle(event.title)}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  },
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">
                  Events on {format(selectedDate, 'PPP')}
                </h3>
                <div className="space-y-4">
                  {getDayEvents(selectedDate).map(event => (
                    <Link
                      key={event.id}
                      href={`/events/${event.slug || event.id}`}
                    >
                      <div className="p-3 rounded-lg border hover:bg-accent transition-colors">
                        <Badge className="mb-2">{event.type}</Badge>
                        <h4 className="font-medium">{event.title}</h4>
                        <div className="text-sm text-muted-foreground mt-2">
                          {event.start_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{event.start_time}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Link href="/events/create">
              <Button className="w-full mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Past Events */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map(event => (
              <Link key={event.id} href={`/events/${event.slug || event.id}`}>
                <Card className="hover:shadow-lg transition-shadow">
                  {event.poster_url && (
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img
                        src={event.poster_url}
                        alt={event.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-2">
                      {event.type}
                    </Badge>
                    <h3 className="font-semibold text-lg mb-2">
                      {event.title}
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{format(new Date(event.start_date), 'PPP')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
