import { ProfileAccountGate } from '@/components/profile/ProfileAccountGate'
import { ProfileDataProvider } from '@/components/profile/ProfileDataProvider'

export default function ProfileAccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProfileDataProvider>
      <ProfileAccountGate>{children}</ProfileAccountGate>
    </ProfileDataProvider>
  )
}
