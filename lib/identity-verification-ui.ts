import { IDENTITY_PENDING_STATUSES } from '@/lib/identity-status'

type StatusTone = 'verified' | 'pending' | 'failed' | 'none'

export function describeStatus(
  verified: boolean,
  status: string | null
): { label: string; tone: StatusTone } {
  if (verified) return { label: 'Verified', tone: 'verified' }

  switch (status) {
    case 'In Review':
      return { label: 'In review', tone: 'pending' }
    case 'In Progress':
    case 'Awaiting User':
      return { label: 'In progress', tone: 'pending' }
    case 'Resubmitted':
      return { label: 'Resubmission required', tone: 'pending' }
    case 'Declined':
      return { label: 'Declined', tone: 'failed' }
    case 'Expired':
    case 'Kyc Expired':
      return { label: 'Expired', tone: 'failed' }
    case 'Abandoned':
      return { label: 'Not completed', tone: 'none' }
    default:
      return { label: 'Not verified', tone: 'none' }
  }
}

export function hasDateOfBirthMismatch(notes: string[]): boolean {
  return notes.some(note => /date of birth|dob|birth.*mismatch/i.test(note))
}

export function getIdentityVerificationUiState(
  identityVerified: boolean,
  identityStatus: string | null,
  busy = false
) {
  const inManualReview = identityStatus === 'In Review'
  const needsResubmission = identityStatus === 'Resubmitted'
  const isAutomaticallyProcessing =
    identityStatus === 'In Progress' || identityStatus === 'Awaiting User'
  const pendingReview =
    !identityVerified &&
    !!identityStatus &&
    IDENTITY_PENDING_STATUSES.has(identityStatus)
  const isDeclined = identityStatus === 'Declined'
  const isExpired =
    identityStatus === 'Expired' || identityStatus === 'Kyc Expired'
  const isAbandoned = identityStatus === 'Abandoned'
  const showFailedPanel = !identityVerified && (isDeclined || isExpired)
  const showAbandonedPanel = !identityVerified && isAbandoned
  const showActionButton =
    !identityVerified &&
    !inManualReview &&
    !isAutomaticallyProcessing &&
    !pendingReview
  const canStartVerification = showActionButton && !busy

  return {
    pendingReview,
    inManualReview,
    needsResubmission,
    isAutomaticallyProcessing,
    isDeclined,
    showFailedPanel,
    showAbandonedPanel,
    showActionButton,
    canStartVerification,
  }
}
