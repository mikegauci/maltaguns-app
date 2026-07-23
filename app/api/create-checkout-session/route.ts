import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { STRIPE_PRICE_IDS } from '@/lib/stripe-prices'
import { getAppUrl } from '@/lib/seo'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: profile.email,
      success_url: `${getAppUrl()}/profile?success=true`,
      cancel_url: `${getAppUrl()}/profile?canceled=true`,
      metadata: {
        userId: user.id,
        credits: plan.credits.toString(),
        creditType: 'featured',
      },
    })

    const { error: insertError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: plan.credits,
        status: 'pending',
        type: 'credit',
        credit_type: 'featured',
        description: `Purchase of ${plan.credits} credits (${priceId})`,
        stripe_payment_id: session.id,
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
