import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const FEATURE_DAYS = 15
const LISTING_EXTEND_DAYS = 30

export async function POST(request: Request) {
  try {
    const { userId, listingId } = await request.json()

    if (!userId || !listingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Require an authenticated session matching the claimed userId
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(
      '[AUTO-FEATURE API] Auto-featuring listing:',
      listingId,
      'for user:',
      userId
    )

    // Find a pending or recently paid featured transaction for this listing
    const { data: transactions, error: txFindError } = await supabaseAdmin
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('credit_type', 'featured')
      .ilike('description', `%${listingId}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    if (txFindError) {
      console.error(
        '[AUTO-FEATURE API] Error finding transactions:',
        txFindError
      )
      return NextResponse.json(
        { error: 'Failed to verify payment' },
        { status: 500 }
      )
    }

    const candidateTx =
      transactions?.find(tx => tx.status === 'pending' && tx.stripe_payment_id) ||
      transactions?.find(
        tx => tx.status === 'completed' && tx.stripe_payment_id
      )

    if (!candidateTx?.stripe_payment_id) {
      return NextResponse.json(
        { error: 'No paid featured checkout found for this listing' },
        { status: 402 }
      )
    }

    // Verify the Stripe checkout session was actually paid
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(
        candidateTx.stripe_payment_id
      )
    } catch (stripeError) {
      console.error(
        '[AUTO-FEATURE API] Error retrieving Stripe session:',
        stripeError
      )
      return NextResponse.json(
        { error: 'Failed to verify Stripe payment' },
        { status: 502 }
      )
    }

    if (
      session.payment_status !== 'paid' ||
      session.metadata?.listingId !== listingId ||
      session.metadata?.userId !== userId
    ) {
      return NextResponse.json(
        { error: 'Payment not completed for this listing' },
        { status: 402 }
      )
    }

    const now = new Date()
    const nowIso = now.toISOString()

    // Check if this listing is already featured
    const { data: existingFeature, error: checkError } = await supabaseAdmin
      .from('featured_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('user_id', userId)
      .maybeSingle()

    if (checkError) {
      console.error(
        '[AUTO-FEATURE API] Error checking existing feature:',
        checkError
      )
      return NextResponse.json(
        { error: 'Failed to check if listing is already featured' },
        { status: 500 }
      )
    }

    const alreadyFeaturedActive =
      existingFeature && new Date(existingFeature.end_date) > now

    // Mark transaction completed if still pending
    if (candidateTx.status === 'pending') {
      const { error: txUpdateError } = await supabaseAdmin
        .from('credit_transactions')
        .update({ status: 'completed' })
        .eq('id', candidateTx.id)

      if (txUpdateError) {
        console.error(
          '[AUTO-FEATURE API] Error updating transaction:',
          txUpdateError
        )
        // Non-critical; continue applying feature
      }
    }

    if (alreadyFeaturedActive) {
      console.log('[AUTO-FEATURE API] Listing is already featured')
      return NextResponse.json({
        success: true,
        message: 'Listing was already featured',
        alreadyFeatured: true,
        expiresAt: existingFeature.end_date,
      })
    }

    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + FEATURE_DAYS)
    const endDateIso = endDate.toISOString()

    // Check if listing needs expiry extension
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('expires_at')
      .eq('id', listingId)
      .single()

    if (listingError) {
      console.error('[AUTO-FEATURE API] Error fetching listing:', listingError)
      return NextResponse.json(
        { error: 'Failed to fetch listing details' },
        { status: 500 }
      )
    }

    const daysUntilExpiration = Math.ceil(
      (new Date(listing.expires_at).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    )

    const newExpiresAt =
      daysUntilExpiration <= FEATURE_DAYS
        ? new Date(
            now.getTime() + LISTING_EXTEND_DAYS * 24 * 60 * 60 * 1000
          ).toISOString()
        : listing.expires_at

    if (newExpiresAt !== listing.expires_at) {
      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({ expires_at: newExpiresAt })
        .eq('id', listingId)

      if (updateError) {
        console.error(
          '[AUTO-FEATURE API] Error updating listing:',
          updateError
        )
        return NextResponse.json(
          { error: 'Failed to update listing' },
          { status: 500 }
        )
      }
    }

    if (existingFeature) {
      const { error: featuredError } = await supabaseAdmin
        .from('featured_listings')
        .update({
          start_date: nowIso,
          end_date: endDateIso,
          updated_at: nowIso,
        })
        .eq('id', existingFeature.id)

      if (featuredError) {
        console.error(
          '[AUTO-FEATURE API] Error updating feature:',
          featuredError
        )
        return NextResponse.json(
          { error: 'Failed to feature listing', details: featuredError },
          { status: 500 }
        )
      }
    } else {
      const { error: featuredError } = await supabaseAdmin
        .from('featured_listings')
        .insert({
          listing_id: listingId,
          user_id: userId,
          start_date: nowIso,
          end_date: endDateIso,
        })

      if (featuredError) {
        console.error(
          '[AUTO-FEATURE API] Error featuring listing:',
          featuredError
        )
        return NextResponse.json(
          { error: 'Failed to feature listing', details: featuredError },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Listing featured automatically',
      expiresAt: endDateIso,
      listingExpiresAt: newExpiresAt,
    })
  } catch (error) {
    console.error('[AUTO-FEATURE API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
