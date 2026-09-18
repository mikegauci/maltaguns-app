import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { buildProfileUpdateFromDidit } from '@/lib/didit'
import {
  type DiditManualStatus,
  fetchDiditSessionDecisionCached,
  formatDiditApiError,
  invalidateDiditSessionDecisionCache,
  sessionVendorDataMatchesUser,
  updateDiditSessionStatus,
} from '@/lib/didit-admin'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set<DiditManualStatus>([
  'Approved',
  'Declined',
  'Resubmitted',
])

export async function PATCH(
  request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const newStatus = body.newStatus as DiditManualStatus
    const sessionId =
      typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const comment =
      typeof body.comment === 'string' ? body.comment.trim() : undefined
    const sendEmail = body.sendEmail === true

    if (!ALLOWED_STATUSES.has(newStatus)) {
      return NextResponse.json(
        { error: 'newStatus must be Approved, Declined, or Resubmitted' },
        { status: 400 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const { supabaseAdmin } = auth

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, didit_session_id')
      .eq('id', params.userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (profile.didit_session_id !== sessionId) {
      return NextResponse.json(
        {
          error:
            "Decisions can only be submitted for the user's current Didit session",
        },
        { status: 400 }
      )
    }

    if (sendEmail && !profile.email) {
      return NextResponse.json(
        { error: 'User has no email address for notification' },
        { status: 400 }
      )
    }

    const remoteBefore = await fetchDiditSessionDecisionCached(sessionId)

    if (!sessionVendorDataMatchesUser(remoteBefore.decision, params.userId)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (remoteBefore.status !== 'In Review') {
      return NextResponse.json(
        {
          error:
            'Only sessions in In Review can be decided from MaltaGuns admin',
        },
        { status: 400 }
      )
    }

    await updateDiditSessionStatus(sessionId, {
      newStatus,
      comment,
      sendEmail,
      emailAddress: sendEmail ? profile.email : undefined,
      emailLanguage: 'en',
    })

    invalidateDiditSessionDecisionCache(sessionId)

    const remote = await fetchDiditSessionDecisionCached(sessionId)
    const profileUpdate = buildProfileUpdateFromDidit(
      remote.status,
      remote.decision
    )

    if (profileUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', params.userId)

      if (updateError) {
        console.error(
          'Failed to sync profile after Didit decision:',
          updateError
        )
        return NextResponse.json(
          { error: 'Decision recorded in Didit but profile sync failed' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      status: remote.status,
    })
  } catch (error) {
    console.error('Error submitting identity review decision:', error)
    return NextResponse.json(
      { error: formatDiditApiError(error) },
      { status: 500 }
    )
  }
}
