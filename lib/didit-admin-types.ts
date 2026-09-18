export const IDENTITY_REVIEW_MEDIA_KINDS = [
  'front',
  'back',
  'portrait',
  'liveness',
  'face_source',
  'face_target',
] as const

export type IdentityReviewMediaKind =
  (typeof IDENTITY_REVIEW_MEDIA_KINDS)[number]

export type DiditManualStatus = 'Approved' | 'Declined' | 'Resubmitted'

export interface UpdateDiditSessionStatusOptions {
  newStatus: DiditManualStatus
  comment?: string
  sendEmail?: boolean
  emailAddress?: string
  emailLanguage?: string
}

export interface AdminIdentityWarning {
  feature: string | null
  risk: string | null
  logType: string | null
  shortDescription: string | null
  longDescription: string | null
}

export interface AdminIdentityReviewDocument {
  status: string | null
  documentType: string | null
  documentNumber: string | null
  personalNumber: string | null
  firstName: string | null
  lastName: string | null
  fullName: string | null
  dateOfBirth: string | null
  age: number | null
  nationality: string | null
  issuingState: string | null
  issuingStateName: string | null
  dateOfIssue: string | null
  expirationDate: string | null
}

export interface AdminIdentityReviewDecision {
  sessionId: string
  sessionStatus: string
  sessionNumber: number | null
  features: string[]
  media: { kind: IdentityReviewMediaKind; available: boolean }[]
  document: AdminIdentityReviewDocument
  liveness: {
    status: string | null
    score: number | null
    faceQuality: number | null
  } | null
  faceMatch: {
    status: string | null
    score: number | null
  } | null
  ipAnalysis: {
    status: string | null
    ipAddress: string | null
    country: string | null
    isVpn: boolean | null
    isProxy: boolean | null
    isTor: boolean | null
  } | null
  amlScreenings: {
    status: string | null
    riskScore: number | null
    hitCount: number
  }[]
  warnings: AdminIdentityWarning[]
  reviewNotes: string[]
}

export interface AdminIdentityReviewProfile {
  id: string
  username: string
  email: string
  firstName: string | null
  lastName: string | null
  identityStatus: string | null
  identityVerified: boolean
  diditSessionId: string | null
  diditSessionCreatedAt: string | null
}

export interface AdminIdentityReviewDetail {
  profile: AdminIdentityReviewProfile
  decision: AdminIdentityReviewDecision
}

export interface AdminIdentityReviewSessionItem {
  sessionId: string
  sessionNumber: number | null
  status: string
  originalStatus: string | null
  fullName: string | null
  documentType: string | null
  country: string | null
  createdAt: string
  lastWarning: string | null
  isReviewed: boolean
  userId: string | null
  username: string | null
  email: string | null
  isCurrentSession: boolean
}

export const ACTIONABLE_IDENTITY_STATUSES = new Set(['In Review'])
