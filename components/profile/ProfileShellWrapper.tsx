import { ProfileShell } from '@/components/profile/ProfileShell'
import { getImpersonationState } from '@/lib/impersonation'
import { getProfileNavContext } from '@/lib/profile-nav-context'

export async function ProfileShellWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const [navContext, impersonation] = await Promise.all([
    getProfileNavContext(),
    getImpersonationState(),
  ])

  return (
    <ProfileShell
      navContext={navContext}
      impersonating={Boolean(impersonation)}
    >
      {children}
    </ProfileShell>
  )
}
