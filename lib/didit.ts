import crypto from 'node:crypto'

const DIDIT_API_BASE = 'https://verification.didit.me'
const WEBHOOK_MAX_SKEW_SECONDS = 300

export const DIDIT_WORKFLOW_ID = 'de3133b2-a348-4bf0-baff-95c06bf6f7f7'

export const DIDIT_SESSION_STATUSES = [
  'Not Started',
  'In Progress',
  'Awaiting User',
  'In Review',
  'Approved',
  'Declined',
  'Resubmitted',
  'Abandoned',
  'Expired',
  'Kyc Expired',
] as const

export type DiditSessionStatus = (typeof DIDIT_SESSION_STATUSES)[number]

export function isDiditSessionStatus(
  value: unknown
): value is DiditSessionStatus {
  return (
    typeof value === 'string' &&
    (DIDIT_SESSION_STATUSES as readonly string[]).includes(value)
  )
}

export interface DiditWebhookPayload {
  event_id?: string
  webhook_type?: string
  timestamp?: number
  created_at?: number
  session_id: string
  status: string
  workflow_id?: string
  vendor_data?: string | null
  metadata?: Record<string, unknown> | null
  decision?: unknown
}

const PROFILE_USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isProfileUserId(value: string | null | undefined): boolean {
  return typeof value === 'string' && PROFILE_USER_ID.test(value)
}

export function resolveWebhookEventId(payload: DiditWebhookPayload): string {
  if (payload.event_id) return payload.event_id

  const timestamp = payload.timestamp ?? payload.created_at ?? 0
  const webhookType = payload.webhook_type ?? 'status.updated'
  const sessionId = payload.session_id ?? 'unknown'

  return `${sessionId}:${webhookType}:${timestamp}`
}

export interface DiditSession {
  sessionId: string
  url: string
  status: string
}

export interface DiditIdentityDetails {
  firstName: string | null
  lastName: string | null
  documentType: string | null
}

export interface ExpectedIdentityDetails {
  firstName?: string | null
  lastName?: string | null
  dateOfBirth?: string | null
}

function requireDiditEnv(
  name: 'DIDIT_API_KEY' | 'DIDIT_WEBHOOK_SECRET'
): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing env.${name}`)
  }
  return value
}

export const DIDIT_VERIFICATION_URL_PATTERN = /^https:\/\/verify\.didit\.me\//

export function isDiditVerificationUrl(
  url: string | null | undefined
): url is string {
  return typeof url === 'string' && DIDIT_VERIFICATION_URL_PATTERN.test(url)
}

export function getVerificationCallbackUrl(origin?: string | null): string {
  if (origin) {
    return `${origin.replace(/\/$/, '')}/verification/complete`
  }

  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.maltaguns.com'
  ).replace(/\/$/, '')

  return `${base}/verification/complete`
}

function buildExpectedDetails(
  expected: ExpectedIdentityDetails | undefined
): Record<string, string> | undefined {
  if (!expected) return undefined

  const details: Record<string, string> = {}
  if (expected.firstName) details.first_name = expected.firstName
  if (expected.lastName) details.last_name = expected.lastName
  if (expected.dateOfBirth) details.date_of_birth = expected.dateOfBirth

  return Object.keys(details).length > 0 ? details : undefined
}

export async function createDiditSession({
  vendorData,
  expectedDetails,
  callbackUrl,
}: {
  vendorData: string
  expectedDetails?: ExpectedIdentityDetails
  callbackUrl?: string
}): Promise<DiditSession> {
  const expected = buildExpectedDetails(expectedDetails)

  const response = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
    method: 'POST',
    headers: {
      'x-api-key': requireDiditEnv('DIDIT_API_KEY'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: DIDIT_WORKFLOW_ID,
      vendor_data: vendorData,
      callback: callbackUrl ?? getVerificationCallbackUrl(),
      language: 'en',
      ...(expected ? { expected_details: expected } : {}),
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Didit session creation failed (${response.status}): ${detail}`
    )
  }

  const session = await response.json()

  if (!session?.session_id || !session?.url) {
    throw new Error('Didit session response was missing session_id or url')
  }

  return {
    sessionId: session.session_id,
    url: session.url,
    status: session.status ?? 'Not Started',
  }
}

function shortenFloats(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shortenFloats)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        shortenFloats(entry),
      ])
    )
  }

  if (
    typeof value === 'number' &&
    !Number.isInteger(value) &&
    value % 1 === 0
  ) {
    return Math.trunc(value)
  }

  return value
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)

  if (value && typeof value === 'object') {
    return Object.keys(value as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }

  return value
}

export function canonicaliseWebhookPayload(payload: unknown): string {
  return JSON.stringify(sortKeys(shortenFloats(payload)))
}

export function isWebhookTimestampFresh(timestamp: number): boolean {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false
  return Math.abs(Date.now() / 1000 - timestamp) <= WEBHOOK_MAX_SKEW_SECONDS
}

export function verifyWebhookSignature(
  payload: unknown,
  signature: string
): boolean {
  const expected = crypto
    .createHmac('sha256', requireDiditEnv('DIDIT_WEBHOOK_SECRET'))
    .update(canonicaliseWebhookPayload(payload), 'utf8')
    .digest('hex')

  if (signature.length !== expected.length) return false

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export function hasIdentityVerificationDecision(decision: unknown): boolean {
  const details = extractIdentityDetails(decision)
  return Boolean(details.firstName && details.lastName)
}

export function shouldApplyWebhookForSession(
  profileSessionId: string | null | undefined,
  payloadSessionId: string | null | undefined
): boolean {
  if (!payloadSessionId) return false
  if (!profileSessionId) return true
  return profileSessionId === payloadSessionId
}

const DECISION_FEATURE_ARRAYS = [
  'id_verifications',
  'nfc_verifications',
  'liveness_checks',
  'face_matches',
  'poa_verifications',
] as const

export function extractReviewNotes(decision: unknown): string[] {
  if (!decision || typeof decision !== 'object') return []

  const record = decision as Record<string, unknown>
  const notes: string[] = []
  const seen = new Set<string>()

  for (const key of DECISION_FEATURE_ARRAYS) {
    const features = record[key]
    if (!Array.isArray(features)) continue

    for (const feature of features) {
      if (!feature || typeof feature !== 'object') continue

      const warnings = (feature as Record<string, unknown>).warnings
      if (!Array.isArray(warnings)) continue

      for (const warning of warnings) {
        if (!warning || typeof warning !== 'object') continue

        const entry = warning as Record<string, unknown>
        const message =
          typeof entry.short_description === 'string'
            ? entry.short_description
            : typeof entry.long_description === 'string'
              ? entry.long_description
              : null

        if (message && !seen.has(message)) {
          seen.add(message)
          notes.push(message)
        }
      }
    }
  }

  return notes
}

export interface ProfileIdentityUpdate {
  identity_status: string
  identity_verified?: boolean
  identity_verified_at?: string | null
  identity_first_name?: string | null
  identity_last_name?: string | null
  identity_document_type?: string | null
  identity_review_notes?: string[] | null
  didit_session_url?: string | null
}

export function buildProfileUpdateFromDidit(
  status: string,
  decision?: unknown
): ProfileIdentityUpdate | null {
  const update: ProfileIdentityUpdate = { identity_status: status }

  switch (status) {
    case 'Approved': {
      if (!hasIdentityVerificationDecision(decision)) return null

      const details = extractIdentityDetails(decision)
      update.identity_verified = true
      update.identity_verified_at = new Date().toISOString()
      update.identity_first_name = details.firstName
      update.identity_last_name = details.lastName
      update.identity_document_type = details.documentType
      update.identity_review_notes = null
      update.didit_session_url = null
      break
    }
    case 'In Review':
      update.identity_verified = false
      update.identity_review_notes = extractReviewNotes(decision)
      break
    case 'Declined':
    case 'Expired':
    case 'Kyc Expired':
      update.identity_verified = false
      update.identity_verified_at = null
      update.identity_review_notes = extractReviewNotes(decision)
      update.didit_session_url = null
      break
    default:
      break
  }

  return update
}

export async function fetchDiditSessionDecision(sessionId: string): Promise<{
  status: string
  decision: unknown
}> {
  const response = await fetch(
    `${DIDIT_API_BASE}/v3/session/${sessionId}/decision/`,
    {
      headers: {
        'x-api-key': requireDiditEnv('DIDIT_API_KEY'),
      },
    }
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Didit decision fetch failed (${response.status}): ${detail}`
    )
  }

  const decision = await response.json()

  if (!decision || typeof decision !== 'object') {
    throw new Error('Didit decision response was invalid')
  }

  const status = (decision as Record<string, unknown>).status
  if (typeof status !== 'string') {
    throw new Error('Didit decision response was missing status')
  }

  return { status, decision }
}

export function extractIdentityDetails(
  decision: unknown
): DiditIdentityDetails {
  const empty: DiditIdentityDetails = {
    firstName: null,
    lastName: null,
    documentType: null,
  }

  if (!decision || typeof decision !== 'object') return empty

  const verifications = (decision as Record<string, unknown>).id_verifications

  if (!Array.isArray(verifications) || verifications.length === 0) return empty

  const primary = verifications[0]
  if (!primary || typeof primary !== 'object') return empty

  const record = primary as Record<string, unknown>
  const readString = (key: string): string | null =>
    typeof record[key] === 'string' && record[key] !== ''
      ? (record[key] as string)
      : null

  return {
    firstName: readString('first_name'),
    lastName: readString('last_name'),
    documentType: readString('document_type'),
  }
}
