import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type UpdateListingBody = {
  listingId: string
  title?: string
  description?: string
  price?: string | number
  type?: string
  category?: string
  subcategory?: string | null
  calibre?: string | null
  status?: string
  expires_at?: string | null
  featured?: boolean
}

function parsePrice(price: string | number | undefined): number | undefined {
  if (price === undefined) return undefined
  if (typeof price === 'number') return price
  const parsed = Number(price)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateListingBody

    if (!body?.listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    // Verify admin privileges using the current session
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUserProfile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

    if (profileError || !currentUserProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin privileges required' },
        { status: 403 }
      )
    }

    // Fetch listing once (for seller_id and existence check)
    const { data: existingListing, error: existingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id')
      .eq('id', body.listingId)
      .single()

    if (existingError || !existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.title !== undefined) updatePayload.title = body.title
    if (body.description !== undefined)
      updatePayload.description = body.description
    if (body.type !== undefined) updatePayload.type = body.type
    if (body.category !== undefined) updatePayload.category = body.category
    if (body.subcategory !== undefined)
      updatePayload.subcategory = body.subcategory || null
    if (body.calibre !== undefined) updatePayload.calibre = body.calibre || null
    if (body.status !== undefined) updatePayload.status = body.status

    const parsedPrice = parsePrice(body.price)
    if (body.price !== undefined && parsedPrice === undefined) {
      return NextResponse.json(
        { error: 'Invalid price. Must be a number.' },
        { status: 400 }
      )
    }
    if (parsedPrice !== undefined) updatePayload.price = parsedPrice

    if (body.expires_at !== undefined) {
      // Allow clearing by sending null; otherwise validate it parses
      if (body.expires_at === null) {
        updatePayload.expires_at = null
      } else {
        const ts = Date.parse(body.expires_at)
        if (Number.isNaN(ts)) {
          return NextResponse.json(
            { error: 'Invalid expires_at. Must be an ISO date string.' },
            { status: 400 }
          )
        }
        updatePayload.expires_at = new Date(ts).toISOString()
      }
    }

    const { data: updatedListing, error: updateError } = await supabaseAdmin
      .from('listings')
      .update(updatePayload)
      .eq('id', body.listingId)
      .select('*')
      .single()

    if (updateError || !updatedListing) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update listing' },
        { status: 500 }
      )
    }

    // Handle featured status via featured_listings table (admin bypasses RLS)
    if (body.featured !== undefined) {
      if (body.featured) {
        const { data: existingFeature } = await supabaseAdmin
          .from('featured_listings')
          .select('id')
          .eq('listing_id', body.listingId)
          .maybeSingle()

        if (!existingFeature) {
          const { error: featureError } = await supabaseAdmin
            .from('featured_listings')
            .insert({
              listing_id: body.listingId,
              user_id: existingListing.seller_id,
              start_date: new Date().toISOString(),
              end_date: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
            })

          if (featureError) {
            return NextResponse.json(
              { error: `Listing updated, but failed to feature: ${featureError.message}` },
              { status: 500 }
            )
          }
        }
      } else {
        const { error: unfeatureError } = await supabaseAdmin
          .from('featured_listings')
          .delete()
          .eq('listing_id', body.listingId)

        if (unfeatureError) {
          return NextResponse.json(
            { error: `Listing updated, but failed to unfeature: ${unfeatureError.message}` },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ success: true, listing: updatedListing })
  } catch (error) {
    console.error('[ADMIN LISTINGS UPDATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

