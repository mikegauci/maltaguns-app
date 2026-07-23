import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Reset Password | MaltaGuns',
  description: 'Reset your MaltaGuns account password.',
  noIndex: true,
})

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
