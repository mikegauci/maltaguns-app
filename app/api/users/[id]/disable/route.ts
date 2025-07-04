import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Create regular client for auth checks
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Get the request body to determine new disabled status
    const { disabled } = await request.json()

    // First check if the current user is an admin
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      )
    }

    // Get the current user's profile to check admin status
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json(
        { error: 'Failed to verify admin status' },
        { status: 401 }
      )
    }

    if (!currentUserProfile.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin privileges required' },
        { status: 403 }
      )
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Check if user exists before trying to update
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

    // Update the user's disabled status with admin client
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
