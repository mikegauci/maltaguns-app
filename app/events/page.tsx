import { format } from 'date-fns'
import EventsClient from './events-client'
import {
  fetchPublicEventsBase,
  fetchPublicEventsForMonth,
} from '@/lib/public-events-data'

export const revalidate = 30

export default async function EventsPage() {
  const initialMonth = format(new Date(), 'yyyy-MM')
  const [{ upcomingEvents, pastEvents }, { calendarEvents }] =
    await Promise.all([
      fetchPublicEventsBase(),
      fetchPublicEventsForMonth(initialMonth),
    ])

  return (
    <EventsClient
      initialUpcomingEvents={upcomingEvents}
      initialPastEvents={pastEvents}
      initialCalendarEvents={calendarEvents}
      initialMonth={initialMonth}
    />
  )
}
