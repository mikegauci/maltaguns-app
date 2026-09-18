import {
  buildProfileUpdateFromDidit,
  fetchDiditSessionDecision,
  isDiditSessionStatus,
} from '@/lib/didit'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function syncIdentityVerificationForUser(
  userId: string
): Promise<{ identity_verified: boolean }> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('identity_verified, identity_status, didit_session_id')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return { identity_verified: false }
  }

  if (profile.identity_verified) {
    return { identity_verified: true }
  }

  if (!profile.didit_session_id) {
    return { identity_verified: profile.identity_verified ?? false }
  }

  try {
    const remote = await fetchDiditSessionDecision(profile.didit_session_id)

    if (!isDiditSessionStatus(remote.status)) {
      return { identity_verified: false }
    }

    const profileUpdate = buildProfileUpdateFromDidit(
      remote.status,
      remote.decision
    )

    const statusChanged = remote.status !== profile.identity_status
    const needsApprovalSync =
      remote.status === 'Approved' && !profile.identity_verified

    if (profileUpdate && (statusChanged || needsApprovalSync)) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId)
        .select('identity_verified')
        .single()

      if (!updateError && updated) {
        return { identity_verified: updated.identity_verified ?? false }
      }
    }

    if (
      remote.status === 'In Review' &&
      profile.identity_status === 'In Review' &&
      profileUpdate?.identity_review_notes?.length
    ) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          identity_review_notes: profileUpdate.identity_review_notes,
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Failed to update identity review notes:', updateError)
      }
    }
  } catch (syncError) {
    console.error('Didit identity sync failed:', syncError)
  }

  return { identity_verified: profile.identity_verified ?? false }
}
