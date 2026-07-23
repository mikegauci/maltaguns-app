import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { STRIPE_PRICE_IDS } from '@/lib/stripe-prices'
import { getAppUrl } from '@/lib/seo'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST() {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_IDS.eventCredit,
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: profile.email,
      success_url: `${getAppUrl()}/events/create?success=true`,
      cancel_url: `${getAppUrl()}/profile?canceled=true`,
      metadata: {
        userId: user.id,
        credits: '1',
        creditType: 'event',
        description: 'Purchase of 1 event credit',
      },
    })

    const { error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: 1,
        status: 'pending',
        type: 'credit',
        credit_type: 'event',
        description: 'Pending purchase of 1 event credit',
        stripe_payment_id: session.id,
      })

    if (transactionError) {
      return NextResponse.json(
        { error: 'Error recording transaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessionId: session.id })
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
