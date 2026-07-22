import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { STRIPE_PRICE_IDS } from '@/lib/stripe-prices'
import { getAppUrl } from '@/lib/seo'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

const FEATURE_LISTING_PRICE_ID = STRIPE_PRICE_IDS.featuredListing

// Helper function to generate a slug from a string
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

export async function POST(request: Request) {
  console.log('[CHECKOUT] Starting checkout process')
  try {
    const { userId, listingId } = await request.json()
    console.log('[CHECKOUT] Request data:', { userId, listingId })

    const supabase = createRouteHandlerClient({ cookies })

    // Verify user exists and get their profile
    console.log('[CHECKOUT] Verifying user profile')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[CHECKOUT] Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    console.log('[CHECKOUT] Found user profile:', profile.email)

    // Get the listing details for metadata
    console.log('[CHECKOUT] Fetching listing details')
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('title')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      console.error('[CHECKOUT] Listing fetch error:', listingError)
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    console.log('[CHECKOUT] Found listing:', listing.title)

    // Block repurchase while an active feature has more than 3 days remaining
    const now = new Date()
    const { data: existingFeature, error: featureCheckError } = await supabase
      .from('featured_listings')
      .select('end_date')
      .eq('listing_id', listingId)
      .gt('end_date', now.toISOString())
      .maybeSingle()

    if (featureCheckError) {
      console.error('[CHECKOUT] Feature status check error:', featureCheckError)
      return NextResponse.json(
        { error: 'Failed to check featured status' },
        { status: 500 }
      )
    }

    if (existingFeature) {
      const daysRemaining = Math.ceil(
        (new Date(existingFeature.end_date).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      )
      if (daysRemaining > 3) {
        return NextResponse.json(
          {
            error: `This listing is already featured for ${daysRemaining} more days. You can renew when 3 or fewer days remain.`,
          },
          { status: 409 }
        )
      }
    }

    // Create success URL with listing slug. Redirect back to the origin the
    // checkout was started from (works for local, preview and prod); fall back
    // to the canonical site URL only when no origin header is present.
    const slug = slugify(listing.title)
    const hostUrl = request.headers.get('origin') || getAppUrl()
    const successUrl = `${hostUrl}/marketplace/listing/${slug}?success=true&listingId=${listingId}`
    const cancelUrl = `${hostUrl}/marketplace/listing/${slug}?canceled=true`

    console.log('[CHECKOUT] URLs:', { successUrl, cancelUrl })

    // Create Stripe checkout session
    console.log('[CHECKOUT] Creating Stripe checkout session')
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: FEATURE_LISTING_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: profile.email,
      metadata: {
        userId: userId,
        listingId: listingId,
      },
    })

    console.log('[CHECKOUT] Stripe session created:', session.id)

    // Pre-create a transaction record with pending status
    console.log('[CHECKOUT] Creating transaction record')
    const { data: txData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 1,
        status: 'pending',
        credit_type: 'featured',
        description: `Feature listing purchase for listing ${listingId}`,
        stripe_payment_id: session.id,
        type: 'debit',
      })
      .select()

    if (transactionError) {
      console.error(
        '[CHECKOUT] Error creating transaction record:',
        transactionError
      )
      // Continue anyway as this is not critical
    } else {
      console.log('[CHECKOUT] Transaction record created:', txData)
    }

    console.log('[CHECKOUT] Redirecting to Stripe checkout:', session.url)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[CHECKOUT] Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
