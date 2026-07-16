import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('help')
}

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
