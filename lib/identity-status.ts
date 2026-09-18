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
  identityStatus: string | null,
  diditSessionId: string | null
) {
  return (
    !!diditSessionId &&
    !identityVerified &&
    IDENTITY_PENDING_STATUSES.has(identityStatus ?? '')
  )
}

export function buildAdminIdentityOverride(verified: boolean) {
  if (verified) {
    return {
      identity_verified: true,
      identity_verified_at: new Date().toISOString(),
      identity_status: 'Approved',
    }
  }

  return {
    identity_verified: false,
    identity_verified_at: null,
    identity_status: 'Not Started',
    didit_session_id: null,
    didit_session_url: null,
    didit_session_created_at: null,
  }
}
