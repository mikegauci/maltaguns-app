import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { constructStripeEvent } from '@/lib/stripe-webhook'
import { handleCheckoutSessionCompleted } from '@/lib/stripe-checkout-completed'
import { stripe } from '@/lib/credit-checkout'

const LOG_PREFIX = '[WEBHOOK-PLURAL]'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not defined')
}

export async function POST(request: Request) {
  console.log(`${LOG_PREFIX} Received webhook request`)
  try {
    const payload = await request.text()
    const signature = request.headers.get('stripe-signature') || ''
    console.log(
      `${LOG_PREFIX} Webhook signature:`,
      signature.substring(0, 10) + '...'
    )

    let event: Stripe.Event

    try {
      console.log(`${LOG_PREFIX} Attempting to verify webhook signature`)
      event = constructStripeEvent(stripe, payload, signature)
      console.log(`${LOG_PREFIX} Signature verified, event type:`, event.type)
    } catch (err: any) {
      console.error(
        `${LOG_PREFIX} Signature verification failed: ${err.message}`
      )
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      return handleCheckoutSessionCompleted(session, {
        logPrefix: LOG_PREFIX,
        handleCredits: false,
      })
    }

    console.log(`${LOG_PREFIX} Event type not handled:`, event.type)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`${LOG_PREFIX} Unexpected error:`, error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
