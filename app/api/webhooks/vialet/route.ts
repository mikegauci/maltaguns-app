import { NextResponse } from 'next/server'
import { verifyCallbackSignature } from '@/lib/vialet'
import { fulfilVialetPurchase } from '@/lib/vialet-checkout'

const LOG_PREFIX = '[VIALET-CALLBACK]'

/**
 * Receives Vialet success_callback deliveries. A non-2xx response makes
 * Vialet retry (up to 8 times over 36 hours).
 */
export async function POST(request: Request) {
  const rawBody = await request.text()

  try {
    const valid = await verifyCallbackSignature(
      rawBody,
      request.headers.get('x-signature')
    )
    if (!valid) {
      console.error(`${LOG_PREFIX} Invalid signature`)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody) as { id?: string; event_type?: string }
    if (!payload.id) {
      return NextResponse.json(
        { error: 'Missing purchase id' },
        { status: 400 }
      )
    }

    const outcome = await fulfilVialetPurchase(payload.id)
    console.log(`${LOG_PREFIX} ${payload.event_type} ${payload.id}: ${outcome}`)
    return NextResponse.json({ received: true, outcome })
  } catch (error) {
    console.error(`${LOG_PREFIX} Error processing callback:`, error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
