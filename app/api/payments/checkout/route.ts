import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isPaymentProductKey, PAYMENT_PRODUCTS } from '@/lib/payment-products'
import { startVialetCheckout } from '@/lib/vialet-checkout'
import { buildClientDetails } from '@/lib/vialet'
import { FEATURE_RENEW_WITHIN_DAYS } from '@/lib/featured-listings'
import { listingPublicPath } from '@/lib/listing-slug'

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const { product: productKey, listingId, source } = await request.json()

    if (!isPaymentProductKey(productKey)) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }

    const product = PAYMENT_PRODUCTS[productKey]

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name, phone, address')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.email) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      )
    }

    let returnPath =
      product.creditType === 'event'
        ? '/events/create'
        : source === 'marketplace'
          ? '/marketplace/create'
          : '/profile'

    if (product.isFeature) {
      if (!listingId) {
        return NextResponse.json(
          { error: 'Missing listingId' },
          { status: 400 }
        )
      }

      const { data: listing, error: listingError } = await supabaseAdmin
        .from('listings')
        .select('id, slug, title, seller_id')
        .eq('id', listingId)
        .single()

      if (listingError || !listing) {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        )
      }

      if (listing.seller_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const now = new Date()
      const { data: existingFeature, error: featureCheckError } =
        await supabaseAdmin
          .from('featured_listings')
          .select('end_date')
          .eq('listing_id', listingId)
          .gt('end_date', now.toISOString())
          .order('end_date', { ascending: false })
          .limit(1)
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

      returnPath = listingPublicPath(listing)
    }

    const url = await startVialetCheckout({
      userId: user.id,
      email: profile.email,
      clientDetails: buildClientDetails(profile),
      productKey,
      listingId: product.isFeature ? listingId : undefined,
      returnPath,
      baseUrl: new URL(request.url).origin,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[CHECKOUT] Error creating Vialet purchase:', error)
    return NextResponse.json(
      { error: 'Failed to start checkout' },
      { status: 500 }
    )
  }
}
