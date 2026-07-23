import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Login | MaltaGuns',
  description: 'Sign in to your MaltaGuns account.',
  noIndex: true,
})

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
