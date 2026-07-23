import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import {
  FEATURE_DAYS,
  getFeatureEndDate,
  getListingExtendDate,
  LISTING_EXTEND_DAYS,
} from '@/lib/featured-listings'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

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

    // Only consider PENDING featured transactions. A completed row has already
    // been applied (by this route or the webhook) and must never be reused,
    // otherwise revisiting an old success URL would re-feature for free.
    const { data: transactions, error: txFindError } = await supabaseAdmin
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('credit_type', 'featured')
      .eq('status', 'pending')
      .ilike('description', `%${listingId}%`)
      .order('created_at', { ascending: false })
      .limit(10)

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

    // Verify each pending transaction against Stripe and use the first session
    // that is genuinely paid for this listing/user. This avoids picking a newer
    // abandoned checkout when an older one was actually paid.
    let paidTx: (typeof transactions)[number] | null = null
    for (const tx of transactions || []) {
      if (!tx.stripe_payment_id) continue
      try {
        const session = await stripe.checkout.sessions.retrieve(
          tx.stripe_payment_id
        )
        if (
          session.payment_status === 'paid' &&
          session.metadata?.listingId === listingId &&
          session.metadata?.userId === userId
        ) {
          paidTx = tx
          break
        }
      } catch (stripeError) {
        console.error(
          '[AUTO-FEATURE API] Error retrieving Stripe session:',
          tx.stripe_payment_id,
          stripeError
        )
        // Keep checking the other pending transactions
      }
    }

    const now = new Date()
    const nowIso = now.toISOString()

    // Existing feature row (unique on listing_id + user_id)
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

    if (!paidTx) {
      // No un-applied paid checkout. If the webhook already featured it, the
      // work is done; report success. Otherwise there is nothing to apply.
      if (existingFeature && new Date(existingFeature.end_date) > now) {
        console.log(
          '[AUTO-FEATURE API] No pending payment; listing already featured'
        )
        return NextResponse.json({
          success: true,
          message: 'Listing was already featured',
          alreadyFeatured: true,
          expiresAt: existingFeature.end_date,
        })
      }

      return NextResponse.json(
        { error: 'No paid featured checkout found for this listing' },
        { status: 402 }
      )
    }

    // A valid, not-yet-applied payment exists. Apply (or renew) a fresh 15-day
    // feature window, matching the webhook's behavior.
    const endDate = getFeatureEndDate(now)
    const endDateIso = endDate.toISOString()

    // Extend listing expiry if it would lapse during the feature window
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
        console.error('[AUTO-FEATURE API] Error updating listing:', updateError)
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

    // Mark the payment consumed only after the feature was applied, so a
    // failure above leaves it pending for a later retry.
    const { error: txUpdateError } = await supabaseAdmin
      .from('credit_transactions')
      .update({ status: 'completed' })
      .eq('id', paidTx.id)

    if (txUpdateError) {
      console.error(
        '[AUTO-FEATURE API] Error updating transaction:',
        txUpdateError
      )
      // Non-critical; the webhook idempotency check also guards duplicates
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
