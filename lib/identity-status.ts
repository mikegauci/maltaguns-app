export const IDENTITY_PENDING_STATUSES = new Set([
  'In Review',
  'In Progress',
  'Awaiting User',
  'Resubmitted',
])

export const IDENTITY_TERMINAL_STATUSES = new Set([
  'Approved',
  'Declined',
  'Expired',
  'Kyc Expired',
  'Abandoned',
])

export function shouldSyncDiditIdentity(
  identityVerified: boolean,
  diditSessionId: string | null
) {
  return !!diditSessionId && !identityVerified
}

export const ADMIN_IDENTITY_OVERRIDE_NOTE =
  'Identity verified by an admin. The user has not completed Didit.'

export function isAdminIdentityOverride({
  identity_verified,
  identity_first_name,
  identity_last_name,
  identity_document_type,
  identity_review_notes,
}: {
  identity_verified: boolean
  identity_first_name?: string | null
  identity_last_name?: string | null
  identity_document_type?: string | null
  identity_review_notes?: string[] | null
}) {
  if (!identity_verified) return false
  if (identity_review_notes?.includes(ADMIN_IDENTITY_OVERRIDE_NOTE)) return true
  return !identity_first_name && !identity_last_name && !identity_document_type
}

export function buildAdminIdentityOverride(verified: boolean) {
  if (verified) {
    return {
      identity_verified: true,
      identity_verified_at: new Date().toISOString(),
      identity_status: 'Approved',
      identity_review_notes: [ADMIN_IDENTITY_OVERRIDE_NOTE],
    }
  }

  return {
    identity_verified: false,
    identity_verified_at: null,
    identity_status: 'Not Started',
    identity_review_notes: null,
    didit_session_id: null,
    didit_session_url: null,
    didit_session_created_at: null,
  }
}
