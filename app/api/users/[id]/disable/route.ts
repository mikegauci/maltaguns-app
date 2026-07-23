import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { disabled } = await request.json()

    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .single()

    if (userProfileError) {
      console.error('Error fetching user profile:', userProfileError)
      return NextResponse.json(
        { error: `Failed to fetch user profile: ${userProfileError.message}` },
        { status: 400 }
      )
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_disabled: disabled })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating user disabled status:', updateError)
      return NextResponse.json(
        { error: `Failed to update user status: ${updateError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `User ${disabled ? 'disabled' : 'enabled'} successfully`,
    })
  } catch (error) {
    console.error('Error in disable/enable operation:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
