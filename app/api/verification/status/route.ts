import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import {
  buildProfileUpdateFromDidit,
  fetchDiditSessionDecision,
  isDiditSessionStatus,
} from '@/lib/didit'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(
        'identity_verified, identity_status, identity_verified_at, identity_first_name, identity_last_name, identity_document_type, identity_review_notes, didit_session_id'
      )
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Failed to load verification status' },
        { status: 500 }
      )
    }

    let current = profile

    if (profile.didit_session_id && !profile.identity_verified) {
      try {
        const remote = await fetchDiditSessionDecision(profile.didit_session_id)

        if (
          isDiditSessionStatus(remote.status) &&
          remote.status !== profile.identity_status
        ) {
          const profileUpdate = buildProfileUpdateFromDidit(
            remote.status,
            remote.decision
          )

          if (profileUpdate) {
            const { data: updated, error: updateError } = await supabaseAdmin
              .from('profiles')
              .update(profileUpdate)
              .eq('id', user.id)
              .select(
                'identity_verified, identity_status, identity_verified_at, identity_first_name, identity_last_name, identity_document_type, identity_review_notes'
              )
              .single()

            if (!updateError && updated) {
              current = { ...profile, ...updated }
            }
          }
        } else if (
          remote.status === 'In Review' &&
          profile.identity_status === 'In Review'
        ) {
          const profileUpdate = buildProfileUpdateFromDidit(
            remote.status,
            remote.decision
          )

          if (profileUpdate?.identity_review_notes?.length) {
            const { data: updated, error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                identity_review_notes: profileUpdate.identity_review_notes,
              })
              .eq('id', user.id)
              .select(
                'identity_verified, identity_status, identity_verified_at, identity_first_name, identity_last_name, identity_document_type, identity_review_notes'
              )
              .single()

            if (!updateError && updated) {
              current = { ...profile, ...updated }
            }
          }
        }
      } catch (syncError) {
        console.error('Didit status sync failed:', syncError)
      }
    }

    return NextResponse.json({
      verified: current.identity_verified,
      status: current.identity_status,
      verifiedAt: current.identity_verified_at,
      firstName: current.identity_first_name,
      lastName: current.identity_last_name,
      documentType: current.identity_document_type,
      reviewNotes: current.identity_review_notes ?? [],
    })
  } catch (error) {
    console.error('Error loading verification status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
