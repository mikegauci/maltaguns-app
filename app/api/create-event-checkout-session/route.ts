import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { createCreditCheckoutSession } from '@/lib/credit-checkout'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { STRIPE_PRICE_IDS } from '@/lib/stripe-prices'
import { getAppUrl } from '@/lib/seo'

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

    const { session, insertError } = await createCreditCheckoutSession({
      userId: user.id,
      email: profile.email,
      stripePriceId: STRIPE_PRICE_IDS.eventCredit,
      credits: 1,
      creditType: 'event',
      successUrl: `${getAppUrl()}/events/create?success=true`,
      cancelUrl: `${getAppUrl()}/profile?canceled=true`,
      description: 'Purchase of 1 event credit',
      pendingDescription: 'Pending purchase of 1 event credit',
    })

    if (insertError) {
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
