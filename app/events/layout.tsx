import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('events')
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
