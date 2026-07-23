import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  FEATURE_DAYS,
  getFeatureEndDate,
  getListingExtendDate,
  LISTING_EXTEND_DAYS,
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
    const newFeatureEndDate = getFeatureEndDate(now)
    const newListingExpiryDate = getListingExtendDate(now)

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

    const { data: existingFeature } = await supabaseAdmin
      .from('featured_listings')
      .select('id')
      .eq('listing_id', listingId)
      .eq('user_id', user.id)
      .gt('end_date', now.toISOString())
      .maybeSingle()

    if (existingFeature) {
      const { error: featureError } = await supabaseAdmin
        .from('featured_listings')
        .update({
          start_date: now.toISOString(),
          end_date: newFeatureEndDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existingFeature.id)

      if (featureError) throw featureError
    } else {
      const { error: featureError } = await supabaseAdmin
        .from('featured_listings')
        .insert({
          listing_id: listingId,
          user_id: user.id,
          start_date: now.toISOString(),
          end_date: newFeatureEndDate.toISOString(),
        })

      if (featureError) throw featureError
    }

    const { error: expiryUpdateError } = await supabaseAdmin
      .from('listings')
      .update({
        expires_at: newListingExpiryDate.toISOString(),
      })
      .eq('id', listingId)
      .eq('seller_id', user.id)

    if (expiryUpdateError) throw expiryUpdateError

    await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id,
      amount: 1,
      credit_type: 'featured',
      status: 'completed',
      description: `Renewed feature for listing ${listingId} for ${FEATURE_DAYS} days and extended expiry for ${LISTING_EXTEND_DAYS} days`,
      type: 'debit',
    })

    return NextResponse.json({
      success: true,
      message: 'Feature renewed successfully',
      expiresAt: newFeatureEndDate.toISOString(),
      listingExpiresAt: newListingExpiryDate.toISOString(),
    })
  } catch (error) {
    console.error('Error renewing feature:', error)
    return NextResponse.json(
      { error: 'Failed to renew feature' },
      { status: 500 }
    )
  }
}
