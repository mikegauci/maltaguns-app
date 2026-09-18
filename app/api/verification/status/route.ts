import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import {
  IDENTITY_SYNC_SELECT,
  syncProfileIdentityFromDidit,
} from '@/lib/sync-identity-verification'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`${IDENTITY_SYNC_SELECT}, didit_session_id`)
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Failed to load verification status' },
        { status: 500 }
      )
    }

    const current = await syncProfileIdentityFromDidit(profile, user.id)

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
