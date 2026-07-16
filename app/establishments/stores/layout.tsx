import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('establishments_stores')
}

export default function StoresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
