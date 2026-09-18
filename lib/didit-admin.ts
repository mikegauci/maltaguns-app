import {
  extractReviewNotes,
  fetchDiditSessionDecision,
  isProfileUserId,
} from '@/lib/didit'
import {
  IDENTITY_REVIEW_MEDIA_KINDS,
  type AdminIdentityReviewDecision,
  type AdminIdentityReviewDocument,
  type AdminIdentityReviewSessionItem,
  type AdminIdentityWarning,
  type IdentityReviewMediaKind,
  type UpdateDiditSessionStatusOptions,
} from '@/lib/didit-admin-types'

export type {
  AdminIdentityReviewDecision,
  AdminIdentityReviewDetail,
  AdminIdentityReviewDocument,
  AdminIdentityReviewProfile,
  AdminIdentityReviewSessionItem,
  AdminIdentityWarning,
  DiditManualStatus,
  IdentityReviewMediaKind,
  UpdateDiditSessionStatusOptions,
} from '@/lib/didit-admin-types'

export {
  ACTIONABLE_IDENTITY_STATUSES,
  IDENTITY_REVIEW_MEDIA_KINDS,
} from '@/lib/didit-admin-types'

const DIDIT_API_BASE = 'https://verification.didit.me'
const DECISION_CACHE_TTL_MS = 120_000
const DEFAULT_SESSION_PAGE_SIZE = 50

const decisionCache = new Map<
  string,
  { expiresAt: number; value: { status: string; decision: unknown } }
>()

export function formatDiditApiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unexpected error'
  }

  const detailMatch = error.message.match(/Didit .* failed \(\d+\):([\s\S]*)$/)
  if (!detailMatch) {
    return error.message
  }

  const rawDetail = detailMatch[1]?.trim()
  if (!rawDetail) {
    return error.message
  }

  try {
    const parsed = JSON.parse(rawDetail) as Record<string, unknown>
    if (typeof parsed.detail === 'string' && parsed.detail) {
      return parsed.detail
    }
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map(entry =>
          typeof entry === 'string'
            ? entry
            : typeof entry === 'object' &&
                entry &&
                'msg' in entry &&
                typeof (entry as { msg: unknown }).msg === 'string'
              ? (entry as { msg: string }).msg
              : JSON.stringify(entry)
        )
        .join('; ')
    }
    if (typeof parsed.message === 'string' && parsed.message) {
      return parsed.message
    }
  } catch {
    return rawDetail
  }

  return error.message
}

export async function fetchDiditSessionDecisionCached(
  sessionId: string
): Promise<{
  status: string
  decision: unknown
}> {
  const cached = decisionCache.get(sessionId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const value = await fetchDiditSessionDecision(sessionId)
  decisionCache.set(sessionId, {
    expiresAt: Date.now() + DECISION_CACHE_TTL_MS,
    value,
  })
  return value
}

export function invalidateDiditSessionDecisionCache(sessionId: string) {
  decisionCache.delete(sessionId)
}

function requireDiditApiKey(): string {
  const value = process.env.DIDIT_API_KEY
  if (!value) {
    throw new Error('Missing env.DIDIT_API_KEY')
  }
  return value
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function firstArrayItem(
  decision: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  const items = decision[key]
  if (!Array.isArray(items) || items.length === 0) return null
  return readRecord(items[0])
}

function collectWarnings(
  decision: Record<string, unknown>
): AdminIdentityWarning[] {
  const warnings: AdminIdentityWarning[] = []
  const seen = new Set<string>()

  const addWarning = (entry: Record<string, unknown>) => {
    const shortDescription = readString(entry.short_description)
    const longDescription = readString(entry.long_description)
    const key = `${readString(entry.feature)}:${readString(entry.risk)}:${shortDescription}:${longDescription}`
    if (seen.has(key)) return
    seen.add(key)
    warnings.push({
      feature: readString(entry.feature),
      risk: readString(entry.risk),
      logType: readString(entry.log_type),
      shortDescription,
      longDescription,
    })
  }

  for (const key of [
    'id_verifications',
    'nfc_verifications',
    'liveness_checks',
    'face_matches',
    'poa_verifications',
    'ip_analyses',
    'aml_screenings',
  ]) {
    const items = decision[key]
    if (!Array.isArray(items)) continue

    for (const item of items) {
      const record = readRecord(item)
      if (!record) continue
      const itemWarnings = record.warnings
      if (!Array.isArray(itemWarnings)) continue
      for (const warning of itemWarnings) {
        const entry = readRecord(warning)
        if (entry) addWarning(entry)
      }
    }
  }

  return warnings
}

function buildDocument(
  record: Record<string, unknown> | null
): AdminIdentityReviewDocument {
  if (!record) {
    return {
      status: null,
      documentType: null,
      documentNumber: null,
      personalNumber: null,
      firstName: null,
      lastName: null,
      fullName: null,
      dateOfBirth: null,
      age: null,
      nationality: null,
      issuingState: null,
      issuingStateName: null,
      dateOfIssue: null,
      expirationDate: null,
    }
  }

  return {
    status: readString(record.status),
    documentType: readString(record.document_type),
    documentNumber: readString(record.document_number),
    personalNumber: readString(record.personal_number),
    firstName: readString(record.first_name),
    lastName: readString(record.last_name),
    fullName: readString(record.full_name),
    dateOfBirth: readString(record.date_of_birth),
    age: readNumber(record.age),
    nationality: readString(record.nationality),
    issuingState: readString(record.issuing_state),
    issuingStateName: readString(record.issuing_state_name),
    dateOfIssue: readString(record.date_of_issue),
    expirationDate: readString(record.expiration_date),
  }
}

export function resolveMediaUrlFromDecision(
  decision: unknown,
  kind: IdentityReviewMediaKind
): string | null {
  const record = readRecord(decision)
  if (!record) return null

  const idVerification = firstArrayItem(record, 'id_verifications')
  const liveness = firstArrayItem(record, 'liveness_checks')
  const faceMatch = firstArrayItem(record, 'face_matches')

  switch (kind) {
    case 'front':
      return readString(idVerification?.front_image)
    case 'back':
      return readString(idVerification?.back_image)
    case 'portrait':
      return readString(idVerification?.portrait_image)
    case 'liveness':
      return readString(liveness?.reference_image)
    case 'face_source':
      return readString(faceMatch?.source_image)
    case 'face_target':
      return readString(faceMatch?.target_image)
    default:
      return null
  }
}

export function buildAdminIdentityReviewDecision(
  decision: unknown
): AdminIdentityReviewDecision {
  const record = readRecord(decision)
  if (!record) {
    throw new Error('Didit decision response was invalid')
  }

  const idVerification = firstArrayItem(record, 'id_verifications')
  const liveness = firstArrayItem(record, 'liveness_checks')
  const faceMatch = firstArrayItem(record, 'face_matches')
  const ipAnalysis = firstArrayItem(record, 'ip_analyses')

  const mediaAvailability = IDENTITY_REVIEW_MEDIA_KINDS.map(kind => ({
    kind,
    available: Boolean(resolveMediaUrlFromDecision(record, kind)),
  }))

  const amlScreenings: AdminIdentityReviewDecision['amlScreenings'] = []
  const amlItems = record.aml_screenings
  if (Array.isArray(amlItems)) {
    for (const item of amlItems) {
      const aml = readRecord(item)
      if (!aml) continue
      const hits = aml.hits
      amlScreenings.push({
        status: readString(aml.status),
        riskScore: readNumber(aml.risk_score),
        hitCount: Array.isArray(hits) ? hits.length : 0,
      })
    }
  }

  const ip = readRecord(ipAnalysis?.ip)
  const location = readRecord(ipAnalysis?.location)

  return {
    sessionId: readString(record.session_id) ?? '',
    sessionStatus: readString(record.status) ?? 'Unknown',
    sessionNumber: readNumber(record.session_number),
    features: Array.isArray(record.features)
      ? record.features.filter(
          (feature): feature is string => typeof feature === 'string'
        )
      : [],
    media: mediaAvailability,
    document: buildDocument(idVerification),
    liveness: liveness
      ? {
          status: readString(liveness.status),
          score: readNumber(liveness.score),
          faceQuality: readNumber(liveness.face_quality),
        }
      : null,
    faceMatch: faceMatch
      ? {
          status: readString(faceMatch.status),
          score: readNumber(faceMatch.score),
        }
      : null,
    ipAnalysis: ipAnalysis
      ? {
          status: readString(ipAnalysis.status),
          ipAddress: readString(ip) ?? readString(ipAnalysis.ip_address),
          country:
            readString(location?.country) ??
            readString(ipAnalysis.country) ??
            readString(ip?.country),
          isVpn:
            readBoolean(ipAnalysis.is_vpn) ??
            readBoolean(ip?.is_vpn) ??
            readBoolean(ipAnalysis.vpn_detected),
          isProxy:
            readBoolean(ipAnalysis.is_proxy) ??
            readBoolean(ip?.is_proxy) ??
            readBoolean(ipAnalysis.proxy_detected),
          isTor:
            readBoolean(ipAnalysis.is_tor) ??
            readBoolean(ip?.is_tor) ??
            readBoolean(ipAnalysis.tor_detected),
        }
      : null,
    amlScreenings,
    warnings: collectWarnings(record),
    reviewNotes: extractReviewNotes(record),
  }
}

export async function updateDiditSessionStatus(
  sessionId: string,
  options: UpdateDiditSessionStatusOptions
): Promise<{ sessionId: string }> {
  const body: Record<string, unknown> = {
    new_status: options.newStatus,
  }

  if (options.comment) {
    body.comment = options.comment
  }

  if (options.sendEmail) {
    body.send_email = true
    if (options.emailAddress) {
      body.email_address = options.emailAddress
    }
    if (options.emailLanguage) {
      body.email_language = options.emailLanguage
    }
  }

  const response = await fetch(
    `${DIDIT_API_BASE}/v3/session/${sessionId}/update-status/`,
    {
      method: 'PATCH',
      headers: {
        'x-api-key': requireDiditApiKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Didit status update failed (${response.status}): ${detail}`
    )
  }

  const result = await response.json()
  const updatedSessionId =
    readString(readRecord(result)?.session_id) ?? sessionId

  return { sessionId: updatedSessionId }
}

export function isIdentityReviewMediaKind(
  value: string | null
): value is IdentityReviewMediaKind {
  return (
    typeof value === 'string' &&
    (IDENTITY_REVIEW_MEDIA_KINDS as readonly string[]).includes(value)
  )
}

export async function listDiditSessions(options?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<{
  sessions: Record<string, unknown>[]
  count: number | null
  hasMore: boolean
}> {
  const limit = options?.limit ?? DEFAULT_SESSION_PAGE_SIZE
  const offset = options?.offset ?? 0

  const params = new URLSearchParams({
    session_kind: 'user',
    limit: String(limit),
    offset: String(offset),
  })

  if (options?.status && options.status !== 'all') {
    params.set('status', options.status)
  }

  const response = await fetch(
    `${DIDIT_API_BASE}/v3/sessions/?${params.toString()}`,
    {
      headers: {
        'x-api-key': requireDiditApiKey(),
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Didit session list failed (${response.status}): ${detail}`)
  }

  const payload = readRecord(await response.json())
  const results = payload?.results

  const sessions = Array.isArray(results)
    ? results.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object'
      )
    : []

  const count = readNumber(payload?.count)
  const hasMore =
    typeof count === 'number'
      ? offset + sessions.length < count
      : sessions.length === limit

  return { sessions, count, hasMore }
}

export async function countDiditSessionsByStatus(
  status: string
): Promise<number> {
  const { count, sessions } = await listDiditSessions({
    status,
    limit: 1,
    offset: 0,
  })

  if (typeof count === 'number') {
    return count
  }

  if (sessions.length === 0) {
    return 0
  }

  const allPending = await listDiditSessions({
    status,
    limit: 200,
    offset: 0,
  })

  return allPending.sessions.length
}

export function sanitizeDiditSessionListItem(
  session: Record<string, unknown>,
  profile?: {
    id: string
    username: string
    email: string
    diditSessionId: string | null
  } | null
): AdminIdentityReviewSessionItem {
  const vendorData = readString(session.vendor_data)
  const userId = vendorData && isProfileUserId(vendorData) ? vendorData : null
  const sessionId = readString(session.session_id) ?? ''

  return {
    sessionId,
    sessionNumber: readNumber(session.session_number),
    status: readString(session.status) ?? 'Unknown',
    originalStatus: readString(session.original_status),
    fullName: readString(session.full_name),
    documentType: readString(session.document_type),
    country: readString(session.country),
    createdAt: readString(session.created_at) ?? '',
    lastWarning: readString(session.last_warning),
    isReviewed: session.is_reviewed === true,
    userId,
    username: profile?.username ?? null,
    email: profile?.email ?? null,
    isCurrentSession: Boolean(
      profile?.diditSessionId && profile.diditSessionId === sessionId
    ),
  }
}

export function sessionVendorDataMatchesUser(
  decision: unknown,
  userId: string
): boolean {
  const record = readRecord(decision)
  if (!record) return false
  const vendorData = readString(record.vendor_data)
  return vendorData === userId
}
