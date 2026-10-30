import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  createPurchase,
  getPurchase,
  isPurchasePaid,
  type VialetClientDetails,
} from '@/lib/vialet'
import {
  isPaymentProductKey,
  PAYMENT_PRODUCTS,
  type PaymentProductKey,
} from '@/lib/payment-products'
import {
  FEATURE_DAYS,
  getFeatureEndDate,
  getListingExtendDate,
} from '@/lib/featured-listings'

const LOG_PREFIX = '[VIALET]'

type StartCheckoutOptions = {
  userId: string
  email: string
  clientDetails?: VialetClientDetails
  productKey: PaymentProductKey
  listingId?: string
  /** Site path the buyer returns to, e.g. `/profile`. */
  returnPath: string
  /** Origin the checkout was started from, so returns land on the same host. */
  baseUrl: string
}

/** Purchase reference stored on Vialet: `<productKey>:<listingId?>`. */
function buildReference(productKey: PaymentProductKey, listingId?: string) {
  return listingId ? `${productKey}:${listingId}` : productKey
}

function parseReference(reference: string | null) {
  const [productKey, listingId] = (reference ?? '').split(':')
  return {
    productKey: isPaymentProductKey(productKey) ? productKey : null,
    listingId: listingId || null,
  }
}

export async function startVialetCheckout(
  options: StartCheckoutOptions
): Promise<string> {
  const {
    userId,
    email,
    clientDetails,
    productKey,
    listingId,
    returnPath,
    baseUrl,
  } = options
  const product = PAYMENT_PRODUCTS[productKey]

  const description = product.isFeature
    ? `Feature listing purchase for listing ${listingId}`
    : `Purchase of ${product.credits} ${
        product.creditType === 'event' ? 'event credit' : 'credit'
      }${product.credits > 1 ? 's' : ''}`

  const { data: tx, error: insertError } = await supabaseAdmin
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: product.credits,
      status: 'pending',
      type: product.isFeature ? 'debit' : 'credit',
      credit_type: product.creditType,
      description,
    })
    .select('id')
    .single()

  if (insertError || !tx) {
    throw new Error(
      `Failed to record pending transaction: ${insertError?.message}`
    )
  }

  const appUrl = baseUrl.replace(/\/$/, '')
  const returnUrl = (result: 'success' | 'failed') =>
    `${appUrl}/api/payments/vialet/return?tx=${tx.id}&result=${result}&next=${encodeURIComponent(returnPath)}`

  try {
    const purchase = await createPurchase({
      email,
      clientDetails,
      productName: product.name,
      priceCents: product.priceCents,
      reference: buildReference(productKey, listingId),
      successRedirect: returnUrl('success'),
      failureRedirect: returnUrl('failed'),
      cancelRedirect: `${appUrl}${returnPath}`,
      // Vialet only accepts callbacks on default ports, so local dev
      // (e.g. localhost:3001) relies on the return redirect alone.
      successCallback: new URL(appUrl).port
        ? undefined
        : `${appUrl}/api/webhooks/vialet`,
    })

    if (!purchase.checkout_url) {
      throw new Error('Vialet did not return a checkout_url')
    }

    await supabaseAdmin
      .from('credit_transactions')
      .update({ external_payment_id: purchase.id })
      .eq('id', tx.id)

    return purchase.checkout_url
  } catch (error) {
    await supabaseAdmin.from('credit_transactions').delete().eq('id', tx.id)
    throw error
  }
}

async function addCredits(
  table: 'credits' | 'credits_events',
  userId: string,
  credits: number
) {
  const { data: existing, error } = await supabaseAdmin
    .from(table)
    .select('amount')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  const now = new Date().toISOString()

  if (existing) {
    const current = parseInt(String(existing.amount)) || 0
    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ amount: (current + credits).toString(), updated_at: now })
      .eq('user_id', userId)
    if (updateError) throw updateError
    return
  }

  const { error: insertError } = await supabaseAdmin.from(table).insert({
    user_id: userId,
    amount: credits.toString(),
    created_at: now,
    updated_at: now,
  })
  if (insertError) throw insertError
}

async function featureListing(userId: string, listingId: string) {
  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('expires_at')
    .eq('id', listingId)
    .single()

  if (listingError) throw listingError

  const now = new Date()
  const startDate = now.toISOString()
  const endDate = getFeatureEndDate(now).toISOString()

  const { data: existing, error: featureError } = await supabaseAdmin
    .from('featured_listings')
    .select('id')
    .eq('listing_id', listingId)
    .eq('user_id', userId)
    .order('end_date', { ascending: false })
    .limit(1)

  if (featureError) throw featureError

  if (existing && existing.length > 0) {
    const { error } = await supabaseAdmin
      .from('featured_listings')
      .update({
        start_date: startDate,
        end_date: endDate,
        updated_at: startDate,
      })
      .eq('id', existing[0].id)
    if (error) throw error
  } else {
    const { error } = await supabaseAdmin.from('featured_listings').insert({
      listing_id: listingId,
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
    })
    if (error) throw error
  }

  // Keep the listing alive for at least the length of the feature period.
  const daysUntilExpiry = Math.floor(
    (new Date(listing.expires_at).getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24)
  )
  if (daysUntilExpiry <= FEATURE_DAYS) {
    const { error } = await supabaseAdmin
      .from('listings')
      .update({ expires_at: getListingExtendDate(now).toISOString() })
      .eq('id', listingId)
    if (error) console.error(`${LOG_PREFIX} Error extending listing:`, error)
  }
}

export type FulfilResult = 'fulfilled' | 'already_processed' | 'not_paid'

/**
 * Confirms a purchase with the Vialet API and applies it exactly once.
 * Safe to call from both the browser return redirect and success_callback;
 * whichever arrives first claims the pending transaction.
 */
export async function fulfilVialetPurchase(
  purchaseId: string
): Promise<FulfilResult> {
  const purchase = await getPurchase(purchaseId)

  if (!isPurchasePaid(purchase)) {
    console.log(
      `${LOG_PREFIX} Purchase ${purchaseId} status: ${purchase.status}`
    )
    return 'not_paid'
  }

  const { productKey, listingId } = parseReference(purchase.reference)
  if (!productKey) {
    throw new Error(`Unknown purchase reference: ${purchase.reference}`)
  }

  const product = PAYMENT_PRODUCTS[productKey]
  if (
    purchase.purchase.total !== product.priceCents ||
    purchase.purchase.currency !== 'EUR'
  ) {
    throw new Error(
      `Amount mismatch for ${purchaseId}: ${purchase.purchase.total} ${purchase.purchase.currency}`
    )
  }

  // Atomic claim: only one caller can flip pending → completed.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('credit_transactions')
    .update({ status: 'completed' })
    .eq('external_payment_id', purchaseId)
    .eq('status', 'pending')
    .select('id, user_id')

  if (claimError) throw claimError
  if (!claimed || claimed.length === 0) return 'already_processed'

  const { id: txId, user_id: userId } = claimed[0]

  try {
    if (product.isFeature) {
      if (!listingId) throw new Error('Missing listingId for feature purchase')
      await featureListing(userId, listingId)
    } else {
      await addCredits(
        product.creditType === 'event' ? 'credits_events' : 'credits',
        userId,
        product.credits
      )
    }
  } catch (error) {
    // Release the claim so a retried callback can apply it again.
    await supabaseAdmin
      .from('credit_transactions')
      .update({ status: 'pending' })
      .eq('id', txId)
    throw error
  }

  console.log(`${LOG_PREFIX} Fulfilled ${productKey} for user ${userId}`)
  return 'fulfilled'
}
