import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('establishments_servicing')
}

export default function ServicingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
