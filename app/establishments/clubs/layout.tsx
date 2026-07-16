import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('establishments_clubs')
}

export default function ClubsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
