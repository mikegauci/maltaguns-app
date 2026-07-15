import Stripe from 'stripe'

/**
 * Supports verifying webhook signatures against more than one signing
 * secret at once. This lets a local `stripe listen` CLI session
 * (STRIPE_WEBHOOK_SECRET_CLI) and a dashboard-registered endpoint
 * (STRIPE_WEBHOOK_SECRET) both deliver events to the same running server
 * without having to swap env vars back and forth.
 */
function getWebhookSecrets(): string[] {
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_CLI,
  ].filter((secret): secret is string => Boolean(secret))

  if (secrets.length === 0) {
    throw new Error(
      'No Stripe webhook secret configured (STRIPE_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET_CLI)'
    )
  }

  return secrets
}

export function constructStripeEvent(
  stripe: Stripe,
  payload: string,
  signature: string
): Stripe.Event {
  const secrets = getWebhookSecrets()
  let lastError: unknown

  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError
}
