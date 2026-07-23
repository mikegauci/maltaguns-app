import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Register | MaltaGuns',
  description: 'Create your MaltaGuns account.',
  noIndex: true,
})

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
