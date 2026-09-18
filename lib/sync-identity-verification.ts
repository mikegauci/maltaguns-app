import {
  buildProfileUpdateFromDidit,
  fetchDiditSessionDecision,
  isDiditSessionStatus,
  type ProfileIdentityUpdate,
} from '@/lib/didit'
import { shouldSyncDiditIdentity } from '@/lib/identity-status'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type SyncableIdentityProfile = {
  id?: string
  identity_verified: boolean | null
  identity_status: string | null
  identity_verified_at?: string | null
  identity_first_name?: string | null
  identity_last_name?: string | null
  identity_document_type?: string | null
  identity_review_notes?: string[] | null
  didit_session_id: string | null
}

export const IDENTITY_SYNC_SELECT =
  'identity_verified, identity_status, identity_verified_at, identity_first_name, identity_last_name, identity_document_type, identity_review_notes'

function reviewNotesDiffer(
  current: string[] | null | undefined,
  next: string[] | null | undefined
): boolean {
  const currentNotes = (current ?? []).filter(Boolean)
  const nextNotes = (next ?? []).filter(Boolean)

  if (nextNotes.length === 0) return false
  if (currentNotes.length !== nextNotes.length) return true

  return nextNotes.some((note, index) => note !== currentNotes[index])
}

export function shouldApplyDiditProfileUpdate(
  profile: SyncableIdentityProfile,
  remoteStatus: string,
  profileUpdate: ProfileIdentityUpdate | null
): boolean {
  if (!profileUpdate) return false

  const statusChanged = remoteStatus !== profile.identity_status
  const needsApprovalSync =
    remoteStatus === 'Approved' && !profile.identity_verified
  const needsNotesSync = reviewNotesDiffer(
    profile.identity_review_notes,
    profileUpdate.identity_review_notes
  )

  return statusChanged || needsApprovalSync || needsNotesSync
}

export async function syncProfileIdentityFromDidit<
  T extends SyncableIdentityProfile,
>(profile: T, userId: string): Promise<T> {
  if (
    !shouldSyncDiditIdentity(
      profile.identity_verified ?? false,
      profile.didit_session_id,
      profile.identity_status
    )
  ) {
    return profile
  }

  try {
    const remote = await fetchDiditSessionDecision(profile.didit_session_id!)

    if (!isDiditSessionStatus(remote.status)) {
      return profile
    }

    const profileUpdate = buildProfileUpdateFromDidit(
      remote.status,
      remote.decision
    )

    if (!shouldApplyDiditProfileUpdate(profile, remote.status, profileUpdate)) {
      return profile
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate!)
      .eq('id', userId)
      .select(IDENTITY_SYNC_SELECT)
      .single()

    if (!updateError && updated) {
      return { ...profile, ...updated }
    }
  } catch (syncError) {
    console.error('Didit identity sync failed:', syncError)
  }

  return profile
}

export async function syncIdentityVerificationForUser(
  userId: string
): Promise<{ identity_verified: boolean }> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select(
      `identity_verified, identity_status, identity_review_notes, didit_session_id`
    )
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return { identity_verified: false }
  }

  if (profile.identity_verified) {
    return { identity_verified: true }
  }

  const synced = await syncProfileIdentityFromDidit(profile, userId)

  return { identity_verified: synced.identity_verified ?? false }
}
