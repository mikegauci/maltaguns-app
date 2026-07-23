import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

const PROFILE_FIELDS = [
  'username',
  'email',
  'first_name',
  'last_name',
  'is_admin',
  'is_seller',
  'is_verified',
  'id_card_verified',
  'is_disabled',
  'notes',
  'license_types',
] as const

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const body = await request.json()

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

    const updateData: Record<string, unknown> = {}
    for (const field of PROFILE_FIELDS) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0 && !body.password) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', params.id)

      if (updateError) {
        console.error('Error updating user profile:', updateError)
        return NextResponse.json(
          { error: `Failed to update user profile: ${updateError.message}` },
          { status: 400 }
        )
      }
    }

    if (body.password) {
      const { error: passwordError } =
        await supabaseAdmin.auth.admin.updateUserById(params.id, {
          password: body.password,
        })

      if (passwordError) {
        console.error('Error updating user password:', passwordError)
        return NextResponse.json(
          { error: `Failed to update password: ${passwordError.message}` },
          { status: 400 }
        )
      }
    }

    if (body.email) {
      const { error: emailError } =
        await supabaseAdmin.auth.admin.updateUserById(params.id, {
          email: body.email,
        })

      if (emailError) {
        console.error('Error updating user email:', emailError)
        return NextResponse.json(
          { error: `Failed to update email: ${emailError.message}` },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    })
  } catch (error) {
    console.error('Error in user update operation:', error)
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

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

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

    const { error: deleteError } = await supabaseAdmin.rpc(
      'delete_user_complete',
      {
        target_user_id: params.id,
      }
    )

    if (deleteError) {
      console.error('Error deleting user:', deleteError)

      if (deleteError.message.includes('User not found')) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: `Failed to delete user: ${deleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete operation:', error)
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
