import { Metadata } from 'next'
import { AdminShell } from '@/components/admin/AdminShell'
import { getImpersonationState } from '@/lib/impersonation'

export const metadata: Metadata = {
  title: 'Admin Dashboard - MaltaGuns',
  description: 'Admin dashboard for MaltaGuns content management',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const impersonation = await getImpersonationState()

  return (
    <AdminShell impersonating={Boolean(impersonation)}>{children}</AdminShell>
  )
}
