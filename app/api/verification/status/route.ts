import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'identity_verified, identity_status, identity_verified_at, identity_first_name, identity_last_name, identity_document_type'
      )
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Failed to load verification status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      verified: profile.identity_verified,
      status: profile.identity_status,
      verifiedAt: profile.identity_verified_at,
      firstName: profile.identity_first_name,
      lastName: profile.identity_last_name,
      documentType: profile.identity_document_type,
    })
  } catch (error) {
    console.error('Error loading verification status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
