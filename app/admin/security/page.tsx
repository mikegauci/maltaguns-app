'use client'

import Link from 'next/link'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { Button } from '@/components/ui/button'
import { AppCard } from '@/components/design-system'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function AdminSecurityPage() {
  return (
    <AdminPageLayout
      title="Admin security"
      description="Manage your admin password and two-factor authentication."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AppCard>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Admin passwords require at least 12 characters with letters and
              numbers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/security/change-password">
                Change password
              </Link>
            </Button>
          </CardContent>
        </AppCard>
        <AppCard>
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>
              TOTP via an authenticator app is required for admin access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/security/mfa">Manage 2FA</Link>
            </Button>
          </CardContent>
        </AppCard>
      </div>
    </AdminPageLayout>
  )
}
