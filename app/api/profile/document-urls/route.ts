import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { signLicenseUrl } from '@/lib/storage-signed-url'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('license_image, id_card_image')
      .eq('id', user.id)
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
