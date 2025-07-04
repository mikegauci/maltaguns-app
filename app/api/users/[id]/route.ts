import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Get the request body
    const { notes } = await request.json()

    // First check if the current user is an admin
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session" },
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
        { error: "Failed to verify admin status" },
        { status: 401 }
      )
    }

    if (!currentUserProfile.is_admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin privileges required" },
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
        { error: "User profile not found" },
        { status: 404 }
      )
    }

    // Update the user's notes with admin client
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ notes })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating user notes:', updateError)
      return NextResponse.json(
        { error: `Failed to update user notes: ${updateError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: "Notes updated successfully" 
    })
  } catch (error) {
    console.error('Error in notes update operation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // First check if the current user is an admin
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session" },
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
        { error: "Failed to verify admin status" },
        { status: 401 }
      )
    }

    if (!currentUserProfile.is_admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin privileges required" },
        { status: 403 }
      )
    }

    // Check if user exists before trying to delete
    const { data: userProfile, error: userProfileError } = await supabase
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
        { error: "User profile not found" },
        { status: 404 }
      )
    }

    // Call the delete_user_complete function with the correct parameter name
    const { data: deleteResult, error: deleteError } = await supabase.rpc(
      'delete_user_complete',
      { target_user_id: params.id }
    )

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      
      // Handle specific error cases
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
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 