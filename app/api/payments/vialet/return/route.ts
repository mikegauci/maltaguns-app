import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fulfilVialetPurchase } from '@/lib/vialet-checkout'

/**
 * Vialet sends the buyer here after checkout (success_redirect /
 * failure_redirect). The purchase is re-checked with the Vialet API before
 * anything is applied, so the query string is never trusted on its own.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const txId = searchParams.get('tx')
  const result = searchParams.get('result')
  const next = searchParams.get('next') ?? '/profile'

  // Only allow same-site relative paths to prevent open redirects.
  const safeNext =
    next.startsWith('/') && !next.startsWith('//') ? next : '/profile'
  const redirectWith = (payment: string) => {
    const url = new URL(safeNext, request.url)
    url.searchParams.set('payment', payment)
    return NextResponse.redirect(url)
  }

  if (result !== 'success' || !txId) {
    return redirectWith('failed')
  }

  try {
    const { data: tx } = await supabaseAdmin
      .from('credit_transactions')
      .select('external_payment_id')
      .eq('id', txId)
      .maybeSingle()

    if (!tx?.external_payment_id) {
      return redirectWith('failed')
    }

    const outcome = await fulfilVialetPurchase(tx.external_payment_id)
    return redirectWith(outcome === 'not_paid' ? 'processing' : 'success')
  } catch (error) {
    console.error('[VIALET-RETURN] Error confirming purchase:', error)
    // success_callback will retry fulfilment in the background.
    return redirectWith('processing')
  }
}
