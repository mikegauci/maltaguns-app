import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  buildProfileUpdateFromDidit,
  fetchDiditSessionDecision,
  isProfileUserId,
  resolveWebhookEventId,
  shouldApplyWebhookForSession,
  verifyDiditWebhookSignature,
  type DiditWebhookPayload,
} from '@/lib/didit'

const LOG_PREFIX = '[WEBHOOK-DIDIT]'
const UNIQUE_VIOLATION = '23505'

export async function POST(request: Request) {
  const raw = await request.text()
  const signatureV2 = request.headers.get('x-signature-v2')
  const signature = request.headers.get('x-signature')
  const timestamp = Number(request.headers.get('x-timestamp'))

  let payload: DiditWebhookPayload
  try {
    payload = JSON.parse(raw)
  } catch {
    console.error(`${LOG_PREFIX} Rejected malformed JSON body`)
    return new NextResponse('Invalid body', { status: 400 })
  }

  try {
    if (
      !verifyDiditWebhookSignature(
        payload,
        raw,
        signatureV2,
        signature,
        timestamp
      )
    ) {
      console.error(`${LOG_PREFIX} Rejected invalid signature`)
      return new NextResponse('Invalid signature', { status: 401 })
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Signature verification error:`, error)
    return new NextResponse('Signature verification failed', { status: 500 })
  }

  const eventId = resolveWebhookEventId(payload)

  const { error: dedupeError } = await supabaseAdmin
    .from('didit_webhook_events')
    .insert({
      event_id: eventId,
      session_id: payload.session_id ?? null,
      status: payload.status ?? null,
      vendor_data: payload.vendor_data ?? null,
    })

  if (dedupeError) {
    if (dedupeError.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    console.error(`${LOG_PREFIX} Failed to record delivery:`, dedupeError)
    return NextResponse.json({ error: 'Delivery log failed' }, { status: 500 })
  }

  const userId = payload.vendor_data

  if (!userId || !isProfileUserId(userId)) {
    console.warn(
      `${LOG_PREFIX} Event ${eventId} had no usable vendor_data; acknowledged without profile update`
    )
    return NextResponse.json({ received: true, skipped: true })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('didit_session_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error(
      `${LOG_PREFIX} Failed to load profile ${userId}:`,
      profileError
    )
    await supabaseAdmin
      .from('didit_webhook_events')
      .delete()
      .eq('event_id', eventId)
    return NextResponse.json(
      { error: 'Profile lookup failed' },
      { status: 500 }
    )
  }

  if (
    !shouldApplyWebhookForSession(profile.didit_session_id, payload.session_id)
  ) {
    console.warn(
      `${LOG_PREFIX} Event ${eventId} ignored for user ${userId}: session ${payload.session_id} does not match active ${profile.didit_session_id}`
    )
    return NextResponse.json({
      received: true,
      skipped: true,
      reason: 'stale_session',
    })
  }

  let decision = payload.decision

  if (!decision && payload.session_id) {
    try {
      const remote = await fetchDiditSessionDecision(payload.session_id)
      decision = remote.decision
    } catch (fetchError) {
      console.error(
        `${LOG_PREFIX} Failed to fetch decision for session ${payload.session_id}:`,
        fetchError
      )
    }
  }

  const profileUpdate = buildProfileUpdateFromDidit(payload.status, decision)

  if (!profileUpdate) {
    console.warn(
      `${LOG_PREFIX} Event ${eventId} retryable for user ${userId}: Approved without identity decision details`
    )

    await supabaseAdmin
      .from('didit_webhook_events')
      .delete()
      .eq('event_id', eventId)

    return NextResponse.json(
      { error: 'Incomplete decision payload' },
      { status: 500 }
    )
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userId)

  if (updateError) {
    console.error(`${LOG_PREFIX} Failed to update profile:`, updateError)

    await supabaseAdmin
      .from('didit_webhook_events')
      .delete()
      .eq('event_id', eventId)

    return NextResponse.json(
      { error: 'Profile update failed' },
      { status: 500 }
    )
  }

  console.log(
    `${LOG_PREFIX} Applied status "${payload.status}" for user ${userId}`
  )

  return NextResponse.json({ received: true })
}
