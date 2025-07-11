// /api/create-checkout-session/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json()
    console.log('Received request:', { priceId, userId })

    // Look up the user's profile using the admin client
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.email) {
      console.error('Profile error:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      )
    }
    console.log('Profile email:', profile.email)

    /*
      Map your internal price IDs from Stripe Dashboard - Products to the corresponding Stripe Price IDs and credit amounts.
    */
    const planMapping: Record<
      string,
      { stripePriceId: string; credits: number }
    > = {
      price_1credit: {
        stripePriceId: 'price_1REOVJPnR92CMKYG6C8vfrGx',
        credits: 1,
      }, // €10
      price_5credits: {
        stripePriceId: 'price_1REOVsPnR92CMKYGewbJKt8I',
        credits: 5,
      }, // €30
      price_10credits: {
        stripePriceId: 'price_1REOWRPnR92CMKYGqwPeb0Sa',
        credits: 10,
      }, // €50
    }

    const plan = planMapping[priceId]
    if (!plan) {
      console.error('Invalid priceId:', priceId)
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }
    console.log('Using plan:', plan)

    // Debug: Check valid values for credit_transactions table
    try {
      const { data: sampleTransaction, error: queryError } = await supabase
        .from('credit_transactions')
        .select('type, credit_type, status')
        .limit(1)

      if (queryError) {
        console.log('Error querying sample transaction:', queryError)
      } else {
        console.log('Sample transaction values:', sampleTransaction)
      }
    } catch (err) {
      console.error('Error checking transaction values:', err)
    }

    // Create a new Stripe Checkout session.
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?canceled=true`,
      metadata: {
        userId: userId,
        credits: plan.credits.toString(),
        creditType: 'featured',
      },
    })
    console.log('Stripe session created:', session.id)

    // Record a pending credit transaction in Supabase.
    try {
      const { error: insertError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: plan.credits,
          type: 'credit',
          credit_type: 'featured',
          description: `Purchase of ${plan.credits} credits (${priceId})`,
          stripe_payment_id: session.id,
        })

      if (insertError) {
        console.error('Error inserting credit transaction:', insertError)
        // Continue execution but log the error
        console.log('Insert error details:', JSON.stringify(insertError))
      } else {
        console.log('Successfully recorded pending transaction')
      }
    } catch (insertError) {
      console.error('Exception inserting credit transaction:', insertError)
    }

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Error in create-checkout-session:', error.message, error)
    return NextResponse.json(
      { error: `Failed to create checkout session: ${error.message}` },
      { status: 500 }
    )
  }
}
