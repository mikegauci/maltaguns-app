import { supabase } from '@/lib/supabase'
import EventClient from './event-client'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { buildMetadata, getSiteSettings, truncateDescription } from '@/lib/seo'

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
  slug: string | null
  meta_title?: string | null
  meta_description?: string | null
}

// Force dynamic rendering (disable static export)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

async function fetchEventBySlug(slug: string): Promise<Event | null> {
  let { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !event) {
    const { data: eventById, error: errorById } = await supabase
      .from('events')
      .select('*')
      .eq('id', slug)
      .single()

    if (errorById || !eventById) {
      return null
    }

    event = eventById
  }

  return event as Event
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const event = await fetchEventBySlug(params.slug)
  if (!event) {
    return { title: 'Event Not Found | MaltaGuns' }
  }

  const siteSettings = await getSiteSettings()
  return buildMetadata({
    title: event.meta_title || `${event.title} | MaltaGuns`,
    description:
      event.meta_description ||
      truncateDescription(event.description) ||
      undefined,
    image: event.poster_url || undefined,
    path: `/events/${params.slug}`,
    siteSettings,
  })
}

export default async function EventPage({
  params,
}: {
  params: { slug: string }
}) {
  const event = await fetchEventBySlug(params.slug)

  if (!event) {
    notFound()
  }

  return <EventClient event={event} />
}
