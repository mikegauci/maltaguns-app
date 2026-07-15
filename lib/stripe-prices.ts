/**
 * Central map of Stripe Price IDs, automatically switched between live and
 * test mode based on which Stripe secret key is configured for the current
 * environment. This keeps price IDs in sync with whichever key
 * (`sk_live_...` or `sk_test_...`) is set, so there's no separate flag to
 * remember to flip when promoting an environment to production.
 */

const secretKey = process.env.STRIPE_SECRET_KEY ?? ''

export const isStripeLiveMode = secretKey.startsWith('sk_live_')

interface StripePriceMap {
  credit1: string
  credit5: string
  credit10: string
  eventCredit: string
  featuredListing: string
}

const LIVE_PRICES: StripePriceMap = {
  credit1: 'price_1TtQUVJNJcIgqZtp2462aFq3', // €15
  credit5: 'price_1TtQUXJNJcIgqZtpMZMPoFWE', // €60
  credit10: 'price_1TtQUXJNJcIgqZtpTTO2gADl', // €100
  eventCredit: 'price_1TtQUcJNJcIgqZtpeM9emUU9', // €25
  featuredListing: 'price_1TtQUdJNJcIgqZtpY4dVR4BA', // €10
}

const TEST_PRICES: StripePriceMap = {
  credit1: 'price_1TtQqLJNJcIgqZtpoWqQd4xe', // €15
  credit5: 'price_1TtQqMJNJcIgqZtpjoUHBahE', // €60
  credit10: 'price_1TtQqwJNJcIgqZtpQejVu4AD', // €100
  eventCredit: 'price_1TtQqxJNJcIgqZtptM2XsO8A', // €25
  featuredListing: 'price_1TtQqSJNJcIgqZtp2XTdleTV', // €10
}

export const STRIPE_PRICE_IDS: StripePriceMap = isStripeLiveMode
  ? LIVE_PRICES
  : TEST_PRICES
