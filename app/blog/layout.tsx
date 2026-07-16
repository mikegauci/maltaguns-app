import type { Metadata } from 'next'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('blog')
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
