import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { signLicenseUrl } from '@/lib/storage-signed-url'

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const userId = params.id
    const { imageUrl } = await request.json()

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        license_image: imageUrl,
        is_seller: true,
        is_verified: false,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user license' },
        { status: 500 }
      )
    }

    const signedUrl = await signLicenseUrl(imageUrl)

    return NextResponse.json({ success: true, signedUrl })
  } catch (error) {
    console.error('Error updating license:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const userId = params.id

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        license_image: null,
        is_seller: false,
        is_verified: false,
        license_types: null,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user license' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting license:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
