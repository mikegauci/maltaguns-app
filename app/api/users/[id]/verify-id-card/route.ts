import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const userId = params.id
    const { verified } = await request.json()

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        id_card_verified: verified,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ID card verification status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating ID card verification status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
