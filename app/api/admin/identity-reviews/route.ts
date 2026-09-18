import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import {
  countDiditSessionsByStatus,
  listDiditSessions,
  sanitizeDiditSessionListItem,
} from '@/lib/didit-admin'
import { isProfileUserId } from '@/lib/didit'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'all'
    const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0)
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get('limit') ?? 50) || 50)
    )

    const [listResult, pendingCount] = await Promise.all([
      listDiditSessions({
        status: status === 'all' ? undefined : status,
        limit,
        offset,
      }),
      countDiditSessionsByStatus('In Review'),
    ])

    const { sessions: rawSessions, count, hasMore } = listResult

    const userIds = Array.from(
      new Set(
        rawSessions
          .map(session => readVendorData(session))
          .filter((id): id is string => Boolean(id) && isProfileUserId(id))
      )
    )

    const profileMap = new Map<
      string,
      {
        id: string
        username: string
        email: string
        diditSessionId: string | null
      }
    >()

    if (userIds.length > 0) {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, username, email, didit_session_id')
        .in('id', userIds)

      if (error) {
        console.error('Error fetching profiles for identity reviews:', error)
        return NextResponse.json(
          { error: `Failed to fetch profiles: ${error.message}` },
          { status: 500 }
        )
      }

      for (const profile of profiles ?? []) {
        profileMap.set(profile.id, {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          diditSessionId: profile.didit_session_id,
        })
      }
    }

    const sessions = rawSessions.map(session => {
      const vendorData = readVendorData(session)
      const profile =
        vendorData && isProfileUserId(vendorData)
          ? (profileMap.get(vendorData) ?? null)
          : null

      return sanitizeDiditSessionListItem(session, profile)
    })

    return NextResponse.json({
      sessions,
      pendingCount,
      hasMore,
      totalCount: count,
      offset,
      limit,
    })
  } catch (error) {
    console.error('Error in identity reviews list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch identity reviews' },
      { status: 500 }
    )
  }
}

function readVendorData(session: Record<string, unknown>): string | null {
  const value = session.vendor_data
  return typeof value === 'string' && value !== '' ? value : null
}
