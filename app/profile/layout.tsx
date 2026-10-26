import type { Metadata } from 'next'
import { ProfileShellWrapper } from '@/components/profile/ProfileShellWrapper'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Profile | MaltaGuns',
  description: 'Manage your MaltaGuns profile.',
  noIndex: true,
})

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProfileShellWrapper>{children}</ProfileShellWrapper>
}
