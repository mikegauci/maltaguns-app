import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import {
  buildAdminIdentityReviewDecision,
  fetchDiditSessionDecisionCached,
  formatDiditApiError,
  sessionVendorDataMatchesUser,
} from '@/lib/didit-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const requestedSessionId = searchParams.get('sessionId')

    const { supabaseAdmin } = auth

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, username, email, first_name, last_name, identity_verified, identity_status, didit_session_id, didit_session_created_at'
      )
      .eq('id', params.userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const sessionId = requestedSessionId ?? profile.didit_session_id

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No Didit session specified for this user' },
        { status: 404 }
      )
    }

    const remote = await fetchDiditSessionDecisionCached(sessionId)

    if (!sessionVendorDataMatchesUser(remote.decision, params.userId)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        identityStatus: profile.identity_status,
        identityVerified: profile.identity_verified ?? false,
        diditSessionId: profile.didit_session_id,
        diditSessionCreatedAt: profile.didit_session_created_at,
      },
      decision: buildAdminIdentityReviewDecision(remote.decision),
      viewingSessionId: sessionId,
      isCurrentSession: profile.didit_session_id === sessionId,
    })
  } catch (error) {
    console.error('Error fetching identity review detail:', error)
    return NextResponse.json(
      { error: formatDiditApiError(error) },
      { status: 500 }
    )
  }
}
