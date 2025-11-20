import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    // Create a regular Supabase client for auth checks
    const supabase = createRouteHandlerClient({ cookies })

    // Check if the current user is an admin
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the current user's profile to check if they are an admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      )
    }

    if (!currentUserProfile.is_admin) {
      return NextResponse.json(
        { error: 'Only admins can update user licenses' },
        { status: 403 }
      )
    }

    // Create an admin client with service_role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Update the user's profile using admin client
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
