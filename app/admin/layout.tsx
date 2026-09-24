import { Metadata } from 'next'
import { AdminSecurityGate } from '@/components/admin/AdminSecurityGate'
import { AdminShell } from '@/components/admin/AdminShell'
import { getImpersonationState } from '@/lib/impersonation'
import { requireAdminUser } from '@/lib/require-auth'

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
  await requireAdminUser('/admin')
  const impersonation = await getImpersonationState()

  return (
    <AdminShell impersonating={Boolean(impersonation)}>
      <AdminSecurityGate>{children}</AdminSecurityGate>
    </AdminShell>
  )
}
