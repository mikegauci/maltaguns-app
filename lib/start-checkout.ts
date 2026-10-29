import type { PaymentProductKey } from '@/lib/payment-products'

type StartCheckoutBody = {
  product: PaymentProductKey
  listingId?: string
  source?: 'profile' | 'marketplace'
}

/** Creates a Vialet purchase and sends the browser to its hosted checkout. */
export async function startCheckout(body: StartCheckoutBody): Promise<void> {
  const res = await fetch('/api/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Failed to start checkout')
  }

  window.location.assign(data.url)
}
