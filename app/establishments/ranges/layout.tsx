import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('establishments_ranges')
}

export default function RangesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
