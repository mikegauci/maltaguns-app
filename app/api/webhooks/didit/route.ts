import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  extractIdentityDetails,
  isProfileUserId,
  isWebhookTimestampFresh,
  resolveWebhookEventId,
  verifyWebhookSignature,
  type DiditWebhookPayload,
} from '@/lib/didit'

const LOG_PREFIX = '[WEBHOOK-DIDIT]'
const UNIQUE_VIOLATION = '23505'

type ProfileIdentityUpdate = {
  identity_status: string
  identity_verified?: boolean
  identity_verified_at?: string | null
  identity_first_name?: string | null
  identity_last_name?: string | null
  identity_document_type?: string | null
  didit_session_url?: string | null
}

function buildProfileUpdate(
  payload: DiditWebhookPayload
): ProfileIdentityUpdate {
  const update: ProfileIdentityUpdate = { identity_status: payload.status }

  switch (payload.status) {
    case 'Approved': {
      const details = extractIdentityDetails(payload.decision)
      update.identity_verified = true
      update.identity_verified_at = new Date().toISOString()
      update.identity_first_name = details.firstName
      update.identity_last_name = details.lastName
      update.identity_document_type = details.documentType
      update.didit_session_url = null
      break
    }
    case 'Declined':
    case 'Expired':
    case 'Kyc Expired':
      update.identity_verified = false
      update.identity_verified_at = null
      update.didit_session_url = null
      break
    default:
      break
  }

  return update
}

export async function POST(request: Request) {
  const raw = await request.text()
  const signature = request.headers.get('x-signature-v2') ?? ''
  const timestamp = Number(request.headers.get('x-timestamp'))

  if (!isWebhookTimestampFresh(timestamp)) {
    console.error(`${LOG_PREFIX} Rejected stale or missing timestamp`)
    return new NextResponse('Stale timestamp', { status: 401 })
  }

  let payload: DiditWebhookPayload
  try {
    payload = JSON.parse(raw)
  } catch {
    console.error(`${LOG_PREFIX} Rejected malformed JSON body`)
    return new NextResponse('Invalid body', { status: 400 })
  }

  try {
    if (!verifyWebhookSignature(payload, signature)) {
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

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(buildProfileUpdate(payload))
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
