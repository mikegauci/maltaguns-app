import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// This endpoint is now deprecated as admin status is controlled directly in the database

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Verify the current user is an admin
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session" },
        { status: 401 }
      )
    }
    
    // Check if the user is an admin
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single()
    
    if (profileError || !profileData || !profileData.is_admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin privileges required" },
        { status: 403 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: "Admin status is now controlled directly via the database"
    })
  } catch (error) {
    console.error('Error in admin init endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 