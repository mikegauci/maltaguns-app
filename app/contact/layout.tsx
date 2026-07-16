import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('contact')
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
