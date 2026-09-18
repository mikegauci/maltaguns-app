import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { countDiditSessionsByStatus } from '@/lib/didit-admin'
import {
  runSafe,
  sumBlogViewCounts,
  sumCompletedRevenueSince,
} from '@/lib/admin-overview'
import type { AdminOverviewResponse } from '@/lib/admin-overview-types'

export const dynamic = 'force-dynamic'

const RECENT_LIMIT = 5

function daysAgoIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function todayIsoDate() {
  return new Date().toISOString().split('T')[0]
}

async function countExact(
  query: PromiseLike<{ count: number | null; error: unknown }>
) {
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function GET() {
  const warnings: string[] = []

  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const sevenDaysAgo = daysAgoIso(7)
    const thirtyDaysAgo = daysAgoIso(30)
    const today = todayIsoDate()

    const identityReviewsPending = await runSafe(
      'Identity reviews',
      () => countDiditSessionsByStatus('In Review'),
      warnings,
      null
    )

    const [
      reportedListingsPending,
      storesPending,
      clubsPending,
      servicingPending,
      rangesPending,
      licenseReviewsPending,
      totalUsers,
      newUsers7d,
      activeListings,
      pendingListings,
      upcomingEvents,
      totalEvents,
      revenue30d,
      recentTransactions,
      recentProfiles,
      blogSnapshot,
    ] = await Promise.all([
      runSafe(
        'Reported listings',
        () =>
          countExact(
            supabaseAdmin
              .from('reported_listings')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
          ),
        warnings,
        0
      ),
      runSafe(
        'Pending stores',
        () =>
          countExact(
            supabaseAdmin
              .from('stores')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
          ),
        warnings,
        0
      ),
      runSafe(
        'Pending clubs',
        () =>
          countExact(
            supabaseAdmin
              .from('clubs')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
          ),
        warnings,
        0
      ),
      runSafe(
        'Pending servicing',
        () =>
          countExact(
            supabaseAdmin
              .from('servicing')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
          ),
        warnings,
        0
      ),
      runSafe(
        'Pending ranges',
        () =>
          countExact(
            supabaseAdmin
              .from('ranges')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
          ),
        warnings,
        0
      ),
      runSafe(
        'License reviews',
        () =>
          countExact(
            supabaseAdmin
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .not('license_image', 'is', null)
              .eq('is_verified', false)
          ),
        warnings,
        0
      ),
      runSafe(
        'Users',
        () =>
          countExact(
            supabaseAdmin
              .from('profiles')
              .select('id', { count: 'exact', head: true })
          ),
        warnings,
        0
      ),
      runSafe(
        'New users',
        () =>
          countExact(
            supabaseAdmin
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', sevenDaysAgo)
          ),
        warnings,
        0
      ),
      runSafe(
        'Active listings',
        () =>
          countExact(
            supabaseAdmin
              .from('listings')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'active')
          ),
        warnings,
        0
      ),
      runSafe(
        'Pending listings',
        () =>
          countExact(
            supabaseAdmin
              .from('listings')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
          ),
        warnings,
        0
      ),
      runSafe(
        'Upcoming events',
        () =>
          countExact(
            supabaseAdmin
              .from('events')
              .select('id', { count: 'exact', head: true })
              .gte('start_date', today)
          ),
        warnings,
        0
      ),
      runSafe(
        'Total events',
        () =>
          countExact(
            supabaseAdmin
              .from('events')
              .select('id', { count: 'exact', head: true })
          ),
        warnings,
        0
      ),
      runSafe(
        'Revenue',
        () => sumCompletedRevenueSince(supabaseAdmin, thirtyDaysAgo),
        warnings,
        null
      ),
      runSafe(
        'Recent payments',
        async () => {
          const result = await supabaseAdmin
            .from('credit_transactions')
            .select('id, user_id, amount, type, created_at, status')
            .or('status.is.null,status.eq.completed,status.eq.succeeded')
            .order('created_at', { ascending: false })
            .limit(RECENT_LIMIT)

          if (result.error) {
            throw result.error
          }

          return result.data ?? []
        },
        warnings,
        []
      ),
      runSafe(
        'Recent signups',
        async () => {
          const result = await supabaseAdmin
            .from('profiles')
            .select('id, username, email, created_at')
            .order('created_at', { ascending: false })
            .limit(RECENT_LIMIT)

          if (result.error) {
            throw result.error
          }

          return result.data ?? []
        },
        warnings,
        []
      ),
      runSafe(
        'Blog snapshot',
        async () => {
          const publishedPosts = await countExact(
            supabaseAdmin
              .from('blog_posts')
              .select('id', { count: 'exact', head: true })
              .eq('published', true)
          )
          const totalViews = await sumBlogViewCounts(supabaseAdmin)

          return { publishedPosts, totalViews }
        },
        warnings,
        null
      ),
    ])

    const recentPaymentUserIds = Array.from(
      new Set(recentTransactions.map(transaction => transaction.user_id))
    )

    const paymentProfiles = await runSafe(
      'Payment usernames',
      async () => {
        if (recentPaymentUserIds.length === 0) {
          return []
        }

        const result = await supabaseAdmin
          .from('profiles')
          .select('id, username')
          .in('id', recentPaymentUserIds)

        if (result.error) {
          throw result.error
        }

        return result.data ?? []
      },
      warnings,
      []
    )

    const usernameById = new Map(
      paymentProfiles.map(profile => [profile.id, profile.username])
    )

    const response: AdminOverviewResponse = {
      actionQueue: {
        identityReviewsPending,
        reportedListingsPending,
        establishmentsPending:
          storesPending + clubsPending + servicingPending + rangesPending,
        licenseReviewsPending,
      },
      stats: {
        totalUsers,
        newUsers7d,
        activeListings,
        pendingListings,
        revenue30d,
        upcomingEvents,
        totalEvents,
      },
      recentSignups: recentProfiles.map(profile => ({
        id: profile.id,
        username: profile.username,
        email: profile.email,
        createdAt: profile.created_at,
      })),
      recentPayments: recentTransactions.map(transaction => ({
        id: transaction.id,
        username: usernameById.get(transaction.user_id) ?? 'Unknown',
        amount: Number(transaction.amount ?? 0),
        type: transaction.type,
        createdAt: transaction.created_at,
      })),
      blog: blogSnapshot,
      warnings,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in admin overview endpoint:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
