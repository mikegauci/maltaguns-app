import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  FEATURE_DAYS,
  getFeatureEndDate,
  getListingExtendDate,
} from '@/lib/featured-listings'

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('seller_id', user.id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Unauthorized or listing not found' },
        { status: 404 }
      )
    }

    const { data: credit, error: creditError } = await supabaseAdmin
      .from('credits')
      .select('id, amount')
      .eq('user_id', user.id)
      .maybeSingle()

    if (creditError) {
      return NextResponse.json(
        { error: 'Failed to check credits' },
        { status: 500 }
      )
    }

    const creditBalance = Number(credit?.amount ?? 0)
    if (!credit || creditBalance < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits to feature listing' },
        { status: 402 }
      )
    }

    const now = new Date()
    const daysUntilExpiration = Math.ceil(
      (new Date(listing.expires_at).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    )

    const newExpiresAt =
      daysUntilExpiration <= FEATURE_DAYS
        ? getListingExtendDate(now)
        : new Date(listing.expires_at)

    const featureEndDate = getFeatureEndDate(now)

    const { error: debitError } = await supabaseAdmin
      .from('credits')
      .update({
        amount: creditBalance - 1,
        updated_at: now.toISOString(),
      })
      .eq('id', credit.id)
      .eq('amount', credit.amount)

    if (debitError) {
      return NextResponse.json(
        { error: 'Failed to debit credits' },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', listingId)
      .eq('seller_id', user.id)

    if (updateError) throw updateError

    const { data: existingFeature } = await supabaseAdmin
      .from('featured_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('user_id', user.id)
      .gt('end_date', now.toISOString())
      .maybeSingle()

    if (existingFeature) {
      const { error: updateFeatureError } = await supabaseAdmin
        .from('featured_listings')
        .update({
          end_date: featureEndDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existingFeature.id)

      if (updateFeatureError) throw updateFeatureError
    } else {
      const { error: featuredError } = await supabaseAdmin
        .from('featured_listings')
        .insert({
          listing_id: listingId,
          user_id: user.id,
          start_date: now.toISOString(),
          end_date: featureEndDate.toISOString(),
        })

      if (featuredError) throw featuredError
    }

    await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id,
      amount: 1,
      credit_type: 'featured',
      status: 'completed',
      description: `Featured listing ${listingId} for ${FEATURE_DAYS} days`,
      type: 'debit',
    })

    return NextResponse.json({
      message: 'Listing featured successfully',
      expires_at: newExpiresAt.toISOString(),
      feature_end_date: featureEndDate.toISOString(),
    })
  } catch (error) {
    console.error('Error featuring listing:', error)
    return NextResponse.json(
      { error: 'Failed to feature listing', details: error },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .eq('seller_id', user.id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Unauthorized or listing not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('featured_listings')
      .delete()
      .eq('listing_id', listingId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error(
        `[FEATURE-API] Error deleting from featured_listings:`,
        deleteError
      )
    }

    return NextResponse.json({
      message: 'Feature removed successfully',
    })
  } catch (error) {
    console.error('Error removing feature:', error)
    return NextResponse.json(
      { error: 'Failed to remove feature', details: error },
      { status: 500 }
    )
  }
}
