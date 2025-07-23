import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: Request) {
  try {
    console.log('[EVENT-CHECKOUT] Starting checkout session creation')
    const { userId } = await request.json()

    // Look up the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.email) {
      console.error('[EVENT-CHECKOUT] User profile not found:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      )
    }

    console.log('[EVENT-CHECKOUT] Creating checkout session for user:', userId)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1Ro4tBH1BEPEAa2SF1bA1Mrb',
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: profile.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/create?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?canceled=true`,
      metadata: {
        userId: userId,
        credits: '1',
        creditType: 'event',
        description: 'Purchase of 1 event credit',
      },
    })

    console.log('[EVENT-CHECKOUT] Checkout session created:', session.id)

    // Record the pending transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 1,
        status: 'pending',
        type: 'credit',
        credit_type: 'event',
        description: 'Pending purchase of 1 event credit',
        stripe_payment_id: session.id,
      })

    if (transactionError) {
      console.error(
        '[EVENT-CHECKOUT] Error recording transaction:',
        transactionError
      )
      return NextResponse.json(
        { error: 'Error recording transaction' },
        { status: 500 }
      )
    }

    console.log('[EVENT-CHECKOUT] Transaction recorded successfully')
    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    console.error('[EVENT-CHECKOUT] Error:', error)
    return NextResponse.json(
      { error: `Failed to create checkout session: ${error.message}` },
      { status: 500 }
    )
  }
}
