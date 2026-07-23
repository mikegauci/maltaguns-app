import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

type CreateCreditCheckoutSessionOptions = {
  userId: string
  email: string
  stripePriceId: string
  credits: number
  creditType: 'featured' | 'event'
  successUrl: string
  cancelUrl: string
  description: string
  pendingDescription?: string
}

export async function createCreditCheckoutSession(
  options: CreateCreditCheckoutSessionOptions
) {
  const {
    userId,
    email,
    stripePriceId,
    credits,
    creditType,
    successUrl,
    cancelUrl,
    description,
    pendingDescription,
  } = options

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      credits: credits.toString(),
      creditType,
      ...(creditType === 'event' ? { description } : {}),
    },
  })

  const { error: insertError } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: credits,
      status: 'pending',
      type: 'credit',
      credit_type: creditType,
      description: pendingDescription ?? description,
      stripe_payment_id: session.id,
    })

  return { session, insertError }
}
