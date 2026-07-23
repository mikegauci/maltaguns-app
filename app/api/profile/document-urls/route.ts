import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { signLicenseUrl } from '@/lib/storage-signed-url'

export const dynamic = 'force-dynamic'

// Returns short-lived signed URLs for the current user's own license/id-card
// images. The licenses bucket is private, so callers can no longer read
// these directly via the stored "public" URL.
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('license_image, id_card_image')
      .eq('id', session.user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Failed to load profile' },
        { status: 500 }
      )
    }

    const [licenseUrl, idCardUrl] = await Promise.all([
      signLicenseUrl(profile.license_image),
      signLicenseUrl(profile.id_card_image),
    ])

    return NextResponse.json({ licenseUrl, idCardUrl })
  } catch (error) {
    console.error('Error signing document URLs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
