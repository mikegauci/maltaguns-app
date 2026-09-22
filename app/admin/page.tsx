'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Banknote,
  Calendar,
  Eye,
  FileText,
  Flag,
  IdCard,
  Package,
  RefreshCw,
  Store,
  Users,
} from 'lucide-react'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { AdminActionCard } from '@/app/admin/components/AdminActionCard'
import { AdminOverviewLists } from '@/app/admin/components/AdminOverviewLists'
import { AdminStatCard } from '@/app/admin/components/AdminStatCard'
import { Button } from '@/components/ui/button'
import { AppAlert, AppCard } from '@/components/design-system'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import type { AdminOverviewResponse } from '@/lib/admin-overview-types'

const NUMBER_FORMAT = 'en-GB'

export default AdminDashboardComponent

function AdminDashboardComponent() {
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/overview')
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load admin overview')
      }

      setOverview(result as AdminOverviewResponse)
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load admin overview'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthorized) return
    scheduleEffectWork(() => {
      void fetchOverview()
    })
  }, [fetchOverview, isAuthorized])

  if (isChecking || !isAuthorized) {
    return null
  }

  if (isLoading) {
    return (
      <AdminPageLayout
        title="Admin Dashboard"
        description="Platform overview and items needing attention."
      >
        <OverviewSkeleton />
      </AdminPageLayout>
    )
  }

  if (error || !overview) {
    return (
      <AdminPageLayout
        title="Admin Dashboard"
        description="Platform overview and items needing attention."
      >
        <AppAlert
          variant="rejected"
          icon={<AlertCircle className="h-4 w-4" />}
          title="Could not load overview"
        >
          <p>{error ?? 'Unknown error'}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void fetchOverview()}
          >
            Try again
          </Button>
        </AppAlert>
      </AdminPageLayout>
    )
  }

  return (
    <AdminPageLayout
      title="Admin Dashboard"
      description="Platform overview and items needing attention."
      actionButton={{
        label: 'Refresh',
        icon: RefreshCw,
        onClick: () => {
          void fetchOverview()
        },
      }}
    >
      <div className="space-y-8">
        {overview.warnings.length > 0 && (
          <AppAlert variant="pending" title="Some metrics are unavailable">
            <ul className="space-y-1">
              {overview.warnings.map(warning => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AppAlert>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Needs attention
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminActionCard
              label="Identity reviews"
              count={overview.actionQueue.identityReviewsPending}
              description="Didit sessions awaiting review"
              href="/admin/identity-reviews?status=in-review"
              icon={IdCard}
            />
            <AdminActionCard
              label="Reported listings"
              count={overview.actionQueue.reportedListingsPending}
              description="Open marketplace reports"
              href="/admin/reported-listings?status=pending"
              icon={Flag}
            />
            <AdminActionCard
              label="Establishments"
              count={overview.actionQueue.establishmentsPending}
              description="Profiles pending approval"
              href="/admin/establishments?status=pending"
              icon={Store}
            />
            <AdminActionCard
              label="License reviews"
              count={overview.actionQueue.licenseReviewsPending}
              description="Uploaded licenses awaiting verification"
              href="/admin/users?filter=pending-license"
              icon={Users}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Platform stats
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="Users"
              value={overview.stats.totalUsers.toLocaleString(NUMBER_FORMAT)}
              subtitle={`+${overview.stats.newUsers7d.toLocaleString(NUMBER_FORMAT)} in the last 7 days`}
              icon={Users}
              href="/admin/users"
            />
            <AdminStatCard
              label="Listings"
              value={overview.stats.activeListings.toLocaleString(
                NUMBER_FORMAT
              )}
              subtitle={`${overview.stats.pendingListings.toLocaleString(NUMBER_FORMAT)} pending moderation`}
              icon={Package}
              href="/admin/listings"
            />
            <AdminStatCard
              label="Revenue (30d)"
              value={
                overview.stats.revenue30d == null
                  ? '—'
                  : `€${overview.stats.revenue30d.toLocaleString(NUMBER_FORMAT)}`
              }
              subtitle="Completed credit transactions"
              icon={Banknote}
              href="/admin/payments-received"
            />
            <AdminStatCard
              label="Events"
              value={overview.stats.upcomingEvents.toLocaleString(
                NUMBER_FORMAT
              )}
              subtitle={`${overview.stats.totalEvents.toLocaleString(NUMBER_FORMAT)} total events`}
              icon={Calendar}
              href="/admin/events"
            />
          </div>
        </section>

        <AdminOverviewLists
          recentSignups={overview.recentSignups}
          recentPayments={overview.recentPayments}
        />

        {overview.blog && (
          <AppCard>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Blog snapshot</CardTitle>
                <CardDescription>
                  Published posts and total views
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/blogs/analytics">View analytics</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-sm border border-border p-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Published posts
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {overview.blog.publishedPosts.toLocaleString(NUMBER_FORMAT)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-sm border border-border p-4">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total views</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {overview.blog.totalViews.toLocaleString(NUMBER_FORMAT)}
                  </p>
                </div>
              </div>
            </CardContent>
          </AppCard>
        )}
      </div>
    </AdminPageLayout>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`action-${index}`} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`stat-${index}`} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  )
}
