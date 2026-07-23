import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { createCreditCheckoutSession } from '@/lib/credit-checkout'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { STRIPE_PRICE_IDS } from '@/lib/stripe-prices'
import { getAppUrl } from '@/lib/seo'

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const { priceId } = await request.json()

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.email) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      )
    }

    const planMapping: Record<
      string,
      { stripePriceId: string; credits: number }
    > = {
      price_1credit: {
        stripePriceId: STRIPE_PRICE_IDS.credit1,
        credits: 1,
      },
      price_5credits: {
        stripePriceId: STRIPE_PRICE_IDS.credit5,
        credits: 5,
      },
      price_10credits: {
        stripePriceId: STRIPE_PRICE_IDS.credit10,
        credits: 10,
      },
    }

    const plan = planMapping[priceId]
    if (!plan) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    const { session, insertError } = await createCreditCheckoutSession({
      userId: user.id,
      email: profile.email,
      stripePriceId: plan.stripePriceId,
      credits: plan.credits,
      creditType: 'featured',
      successUrl: `${getAppUrl()}/profile?success=true`,
      cancelUrl: `${getAppUrl()}/profile?canceled=true`,
      description: `Purchase of ${plan.credits} credits (${priceId})`,
    })

    if (insertError) {
      console.error('Error inserting credit transaction:', insertError)
    }

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
