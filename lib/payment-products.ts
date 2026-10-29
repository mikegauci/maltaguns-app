export type PaymentProductKey =
  'credit1' | 'credit5' | 'credit10' | 'eventCredit' | 'featuredListing'

export type PaymentProduct = {
  name: string
  /** Amount in euro cents. */
  priceCents: number
  credits: number
  creditType: 'featured' | 'event'
  /** Featuring spends the payment on a listing instead of adding credits. */
  isFeature?: boolean
}

export const PAYMENT_PRODUCTS: Record<PaymentProductKey, PaymentProduct> = {
  credit1: {
    name: 'MaltaGuns - 1 listing credit',
    priceCents: 1500,
    credits: 1,
    creditType: 'featured',
  },
  credit5: {
    name: 'MaltaGuns - 5 listing credits',
    priceCents: 6000,
    credits: 5,
    creditType: 'featured',
  },
  credit10: {
    name: 'MaltaGuns - 10 listing credits',
    priceCents: 10000,
    credits: 10,
    creditType: 'featured',
  },
  eventCredit: {
    name: 'MaltaGuns - 1 event credit',
    priceCents: 2500,
    credits: 1,
    creditType: 'event',
  },
  featuredListing: {
    name: 'MaltaGuns - Featured listing',
    priceCents: 1000,
    credits: 1,
    creditType: 'featured',
    isFeature: true,
  },
}

export function isPaymentProductKey(
  value: unknown
): value is PaymentProductKey {
  return typeof value === 'string' && value in PAYMENT_PRODUCTS
}
