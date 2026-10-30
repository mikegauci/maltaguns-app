import { createVerify } from 'crypto'

/**
 * Minimal client for the Vialet Gate API (https://gate.vialet.eu/api/).
 *
 * Test vs live mode is decided entirely by which API key is configured:
 * a Test key creates test purchases that accept the documented test cards.
 */

const VIALET_API_BASE = 'https://gate.vialet.eu/api/v1'

export type VialetPurchaseStatus =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'error'
  | 'cancelled'
  | 'overdue'
  | 'expired'
  | 'blocked'
  | 'hold'
  | 'released'
  | 'pending_release'
  | 'pending_capture'
  | 'preauthorized'
  | 'paid'
  | 'pending_execute'
  | 'pending_charge'
  | 'cleared'
  | 'settled'
  | 'chargeback'
  | 'pending_refund'
  | 'refunded'
  | (string & {})

export interface VialetPurchase {
  id: string
  status: VialetPurchaseStatus
  reference: string | null
  is_test: boolean
  checkout_url: string | null
  brand_id: string
  purchase: {
    currency: string
    total: number
    products: { name: string; price: number; quantity?: string }[]
  }
  client: { email: string }
}

// Statuses that mean the customer's money was successfully taken.
const PAID_STATUSES = new Set(['paid', 'cleared', 'settled'])

export function isPurchasePaid(purchase: VialetPurchase): boolean {
  return PAID_STATUSES.has(purchase.status)
}

function getConfig() {
  const apiKey = process.env.VIALET_API_KEY
  const brandId = process.env.VIALET_BRAND_ID
  if (!apiKey || !brandId) {
    throw new Error('VIALET_API_KEY and VIALET_BRAND_ID must be configured')
  }
  return { apiKey, brandId }
}

async function vialetRequest<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown }
): Promise<T> {
  const { apiKey } = getConfig()
  const res = await fetch(`${VIALET_API_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `Vialet ${init.method} ${path} failed (${res.status}): ${text}`
    )
  }

  return (await res.json()) as T
}

/** Optional ClientDetails; any field sent is skipped on Vialet's details step. */
export type VialetClientDetails = {
  full_name?: string
  phone?: string
  country?: string
  city?: string
  street_address?: string
  zip_code?: string
}

// Malta postcodes look like "SLM 1234" or "VLT1234".
const MALTA_POSTCODE = /\b([A-Z]{3})\s?(\d{4})\b/i

/**
 * Builds Vialet client details from a profile so the hosted checkout can
 * skip its billing-details step. Addresses are free text ("123 Main St,
 * Valletta"), so the locality is taken from the last comma-separated part.
 * Fields that can't be derived are omitted and Vialet asks for them instead.
 */
export function buildClientDetails(profile: {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  address?: string | null
}): VialetClientDetails {
  const details: VialetClientDetails = { country: 'MT' }

  const fullName = [profile.first_name, profile.last_name]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(' ')
  if (fullName) details.full_name = fullName

  const phone = profile.phone?.trim()
  if (phone) details.phone = phone

  let address = profile.address?.trim() ?? ''
  const postcode = address.match(MALTA_POSTCODE)
  if (postcode) {
    details.zip_code = `${postcode[1].toUpperCase()} ${postcode[2]}`
    address = address.replace(postcode[0], '')
  }

  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
  if (parts.length > 1) {
    details.city = parts.pop()
    details.street_address = parts.join(', ')
  } else if (parts.length === 1) {
    details.street_address = parts[0]
  }

  return details
}

type CreatePurchaseOptions = {
  email: string
  clientDetails?: VialetClientDetails
  productName: string
  priceCents: number
  reference: string
  successRedirect: string
  failureRedirect: string
  cancelRedirect?: string
  successCallback?: string
}

export async function createPurchase(
  options: CreatePurchaseOptions
): Promise<VialetPurchase> {
  const { brandId } = getConfig()

  return vialetRequest<VialetPurchase>('/purchases/', {
    method: 'POST',
    body: {
      brand_id: brandId,
      client: { ...options.clientDetails, email: options.email },
      purchase: {
        currency: 'EUR',
        products: [{ name: options.productName, price: options.priceCents }],
      },
      reference: options.reference,
      send_receipt: true,
      success_redirect: options.successRedirect,
      failure_redirect: options.failureRedirect,
      ...(options.cancelRedirect
        ? { cancel_redirect: options.cancelRedirect }
        : {}),
      ...(options.successCallback
        ? { success_callback: options.successCallback }
        : {}),
    },
  })
}

export async function getPurchase(id: string): Promise<VialetPurchase> {
  return vialetRequest<VialetPurchase>(
    `/purchases/${encodeURIComponent(id)}/`,
    { method: 'GET' }
  )
}

let cachedPublicKey: string | null = null

async function getCallbackPublicKey(): Promise<string> {
  if (!cachedPublicKey) {
    cachedPublicKey = await vialetRequest<string>('/public_key/', {
      method: 'GET',
    })
  }
  return cachedPublicKey
}

/**
 * Verifies the X-Signature header of a success_callback delivery:
 * base64 RSA PKCS#1 v1.5 signature over the SHA256 of the raw body.
 */
export async function verifyCallbackSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) return false
  const publicKey = await getCallbackPublicKey()
  const verifier = createVerify('sha256')
  verifier.update(rawBody)
  verifier.end()
  return verifier.verify(publicKey, signature, 'base64')
}
