import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { createAndEmailNotification } from '@/lib/notify-created'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const bodySchema = z.object({
  eventId: z.string().uuid(),
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

    const { eventId } = parsed.data

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, created_by, title, slug')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const eventPath = `/events/${event.slug || event.id}`
    const dedupeKey = `event_created:${event.id}`

    const result = await createAndEmailNotification({
      userId: user.id,
      type: 'event_created',
      title: 'Event successfully created',
      body: `Your event "${event.title}" is now live on MaltaGuns. You can manage your events from your profile.`,
      linkUrl: eventPath,
      dedupeKey,
    })

    return NextResponse.json({ ok: result.ok })
  } catch (error) {
    console.error('[NOTIFY EVENT CREATED] Unexpected error:', error)
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
