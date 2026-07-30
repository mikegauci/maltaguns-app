import {
  sendNotificationEmail,
  type NotificationEmailPayload,
} from '@/lib/notification-email'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const PERMANENT_EMAIL_FAILURE = 'No email on profile'

export { PERMANENT_EMAIL_FAILURE }

export type DeliverNotificationEmailResult =
  | { status: 'sent' }
  | { status: 'failed'; error: string }
  | { status: 'permanent_failure' }

export async function deliverNotificationEmail(params: {
  notification: NotificationEmailPayload
  to: string | null | undefined
  unsubscribeUrl?: string
}): Promise<DeliverNotificationEmailResult> {
  const { notification, to, unsubscribeUrl } = params

  if (!to) {
    await supabaseAdmin
      .from('notifications')
      .update({
        email_status: 'failed',
        email_error: PERMANENT_EMAIL_FAILURE,
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', notification.id)

    return { status: 'permanent_failure' }
  }

  const emailResult = await sendNotificationEmail({
    notification,
    to,
    unsubscribeUrl,
  })

  if (!emailResult.success) {
    await supabaseAdmin
      .from('notifications')
      .update({
        email_status: 'pending',
        email_error: emailResult.error,
        email_sent_at: null,
      })
      .eq('id', notification.id)

    return { status: 'failed', error: emailResult.error ?? 'Send failed' }
  }

  await supabaseAdmin
    .from('notifications')
    .update({
      email_status: 'sent',
      email_error: null,
      email_sent_at: new Date().toISOString(),
    })
    .eq('id', notification.id)

  return { status: 'sent' }
}

export async function createAndEmailNotification(params: {
  userId: string
  type: string
  title: string
  body: string
  linkUrl: string
  dedupeKey: string
}): Promise<{ ok: boolean }> {
  const { userId, type, title, body, linkUrl, dedupeKey } = params

  const { error: upsertError } = await supabaseAdmin
    .from('notifications')
    .upsert(
      {
        user_id: userId,
        type,
        title,
        body,
        link_url: linkUrl,
        dedupe_key: dedupeKey,
        email_status: 'pending',
      },
      { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true }
    )

  if (upsertError) throw upsertError

  const { data: notification, error: notifError } = await supabaseAdmin
    .from('notifications')
    .select(
      'id, user_id, type, title, body, link_url, created_at, email_status, email_error'
    )
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey)
    .single()

  if (notifError || !notification) {
    throw notifError ?? new Error('Failed to load notification')
  }

  if (notification.email_status === 'sent') {
    return { ok: true }
  }

  if (
    notification.email_status === 'failed' &&
    notification.email_error === PERMANENT_EMAIL_FAILURE
  ) {
    return { ok: true }
  }

  if (notification.email_error === 'sending') {
    return { ok: true }
  }

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('notifications')
    .update({ email_error: 'sending' })
    .eq('id', notification.id)
    .in('email_status', ['pending', 'failed'])
    .or(
      `email_error.is.null,and(email_error.neq."${PERMANENT_EMAIL_FAILURE}",email_error.neq.sending)`
    )
    .select('id')
    .maybeSingle()

  if (claimError) throw claimError
  if (!claimed) {
    return { ok: true }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError

  const result = await deliverNotificationEmail({
    notification,
    to: profile?.email,
  })

  return { ok: result.status !== 'failed' }
}
