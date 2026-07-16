import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('establishments')
}

export default function EstablishmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
