import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { createAndEmailNotification } from '@/lib/notify-created'
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

    const result = await createAndEmailNotification({
      userId: user.id,
      type: 'listing_created',
      title: 'Listing successfully created',
      body: `Your listing "${listing.title}" is now live on MaltaGuns. You can manage all your listings from your profile.`,
      linkUrl: listingPath,
      dedupeKey,
    })

    return NextResponse.json({ ok: result.ok })
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
