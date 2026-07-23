import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Unsubscribe | MaltaGuns',
  description: 'Manage your MaltaGuns email preferences.',
  noIndex: true,
})

export default function UnsubscribeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
