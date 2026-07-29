import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { sendNotificationEmail } from '@/lib/notification-email'
import { slugify } from '@/app/marketplace/create/utils'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const bodySchema = z.object({
  listingId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { listingId } = parsed.data

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id, title')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const listingPath = `/marketplace/listing/${slugify(listing.title)}`
    const dedupeKey = `listing_created:${listing.id}`

    const { error: upsertError } = await supabaseAdmin
      .from('notifications')
      .upsert(
        {
          user_id: user.id,
          type: 'listing_created',
          title: 'Listing successfully created',
          body: `Your listing "${listing.title}" is now live on MaltaGuns. You can manage all your listings from your profile.`,
          link_url: listingPath,
          dedupe_key: dedupeKey,
          email_status: 'pending',
        },
        { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true }
      )

    if (upsertError) throw upsertError

    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select(
        'id, user_id, type, title, body, link_url, created_at, email_status'
      )
      .eq('user_id', user.id)
      .eq('dedupe_key', dedupeKey)
      .single()

    if (notifError || !notification) {
      throw notifError ?? new Error('Failed to load notification')
    }

    if (notification.email_status !== 'pending') {
      return NextResponse.json({ ok: true })
    }

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('notifications')
      .update({ email_error: 'sending' })
      .eq('id', notification.id)
      .eq('email_status', 'pending')
      .is('email_error', null)
      .select('id')
      .maybeSingle()

    if (claimError) throw claimError
    if (!claimed) {
      return NextResponse.json({ ok: true })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    const to = profile?.email
    if (!to) {
      await supabaseAdmin
        .from('notifications')
        .update({
          email_status: 'failed',
          email_error: 'No email on profile',
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id)

      return NextResponse.json({ ok: true })
    }

    const emailResult = await sendNotificationEmail({
      notification,
      to,
    })

    if (!emailResult.success) {
      console.error(
        '[NOTIFY CREATED] Email failed:',
        emailResult.error,
        listingId
      )
      await supabaseAdmin
        .from('notifications')
        .update({
          email_status: 'failed',
          email_error: emailResult.error,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id)

      return NextResponse.json({ ok: true })
    }

    await supabaseAdmin
      .from('notifications')
      .update({
        email_status: 'sent',
        email_error: null,
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', notification.id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[NOTIFY CREATED] Unexpected error:', error)
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
