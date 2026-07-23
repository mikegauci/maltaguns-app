import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { stripe } from '@/lib/credit-checkout'
import { STRIPE_PRICE_IDS } from '@/lib/stripe-prices'
import { getAppUrl } from '@/lib/seo'
import { FEATURE_RENEW_WITHIN_DAYS } from '@/lib/featured-listings'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

const FEATURE_LISTING_PRICE_ID = STRIPE_PRICE_IDS.featuredListing

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.email) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('title, seller_id')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.seller_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const now = new Date()
    const { data: existingFeature, error: featureCheckError } = await supabase
      .from('featured_listings')
      .select('end_date')
      .eq('listing_id', listingId)
      .gt('end_date', now.toISOString())
      .maybeSingle()

    if (featureCheckError) {
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
      if (daysRemaining > FEATURE_RENEW_WITHIN_DAYS) {
        return NextResponse.json(
          {
            error: `This listing is already featured for ${daysRemaining} more days. You can renew when ${FEATURE_RENEW_WITHIN_DAYS} or fewer days remain.`,
          },
          { status: 409 }
        )
      }
    }

    const slug = slugify(listing.title)
    const hostUrl = getAppUrl()
    const successUrl = `${hostUrl}/marketplace/listing/${slug}?success=true&listingId=${listingId}`
    const cancelUrl = `${hostUrl}/marketplace/listing/${slug}?canceled=true`

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
        userId: user.id,
        listingId: listingId,
      },
    })

    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: 1,
        status: 'pending',
        credit_type: 'featured',
        description: `Feature listing purchase for listing ${listingId}`,
        stripe_payment_id: session.id,
        type: 'debit',
      })

    if (transactionError) {
      console.error(
        '[CHECKOUT] Error creating transaction record:',
        transactionError
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[CHECKOUT] Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
