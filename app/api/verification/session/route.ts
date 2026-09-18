import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import {
  createDiditSession,
  getVerificationCallbackUrl,
  isDiditVerificationUrl,
} from '@/lib/didit'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SESSION_REUSE_WINDOW_MS = 15 * 60 * 1000

const TERMINAL_STATUSES = new Set([
  'Approved',
  'Declined',
  'Expired',
  'Kyc Expired',
  'Abandoned',
])

const ACTIVE_STATUSES = new Set([
  'In Review',
  'In Progress',
  'Awaiting User',
  'Resubmitted',
])

export async function POST() {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(
        'first_name, last_name, birthday, identity_verified, identity_status, didit_session_url, didit_session_created_at'
      )
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Error loading profile for verification:', profileError)
      return NextResponse.json(
        { error: 'Failed to load your profile' },
        { status: 500 }
      )
    }

    if (profile.identity_verified) {
      return NextResponse.json(
        { error: 'Your identity is already verified.' },
        { status: 409 }
      )
    }

    if (ACTIVE_STATUSES.has(profile.identity_status ?? '')) {
      return NextResponse.json(
        {
          error:
            'Your identity verification is already in progress or under review.',
        },
        { status: 409 }
      )
    }

    if (!profile.first_name || !profile.last_name) {
      return NextResponse.json(
        {
          error:
            'Add your first and last name to your profile before verifying your identity. We check them against your document.',
        },
        { status: 400 }
      )
    }

    const createdAt = profile.didit_session_created_at
      ? new Date(profile.didit_session_created_at).getTime()
      : 0
    const isReusable =
      !!profile.didit_session_url &&
      Date.now() - createdAt < SESSION_REUSE_WINDOW_MS &&
      !TERMINAL_STATUSES.has(profile.identity_status ?? '')

    if (isReusable && isDiditVerificationUrl(profile.didit_session_url)) {
      return NextResponse.json({ url: profile.didit_session_url })
    }

    const headerList = await headers()
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
    const proto = headerList.get('x-forwarded-proto') ?? 'https'
    const requestOrigin = host
      ? `${proto}://${host.split(',')[0].trim()}`
      : null

    const session = await createDiditSession({
      vendorData: user.id,
      expectedDetails: {
        firstName: profile.first_name,
        lastName: profile.last_name,
        dateOfBirth: profile.birthday,
      },
      callbackUrl: getVerificationCallbackUrl(requestOrigin),
    })

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        didit_session_id: session.sessionId,
        didit_session_url: session.url,
        didit_session_created_at: new Date().toISOString(),
        identity_status: session.status,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error storing Didit session:', updateError)
      return NextResponse.json(
        { error: 'Failed to start verification' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating verification session:', error)
    return NextResponse.json(
      { error: 'Failed to start verification' },
      { status: 500 }
    )
  }
}
