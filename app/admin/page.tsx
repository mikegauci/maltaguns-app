'use client'

import Link from 'next/link'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { ADMIN_NAV_GROUPS } from '@/lib/admin-nav'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'

export default AdminDashboardComponent

function AdminDashboardComponent() {
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })

  if (isChecking || !isAuthorized) {
    return null
  }

  return (
    <AdminPageLayout
      title="Admin Dashboard"
      description="Manage MaltaGuns content, users, and marketplace operations."
    >
      <div className="space-y-8">
        {ADMIN_NAV_GROUPS.map(group => (
          <section key={group.label} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {group.items.map(item => {
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href}>
                    <Card className="h-full transition-colors hover:border-primary/30 hover:bg-accent/30">
                      <CardHeader className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base">
                            {item.title}
                          </CardTitle>
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </AdminPageLayout>
  )
}
