import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const AUTHORIZED_ADMIN_EMAILS = [
  "etsy@motorelement.com",
  "info@maltaguns.com"
]

export async function GET() {
  try {
    // Create a regular Supabase client to check authorization
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if the user is authorized
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session" },
        { status: 401 }
      )
    }
    
    // Check if the user is an admin
    const userEmail = session.user.email
    if (!userEmail || !AUTHORIZED_ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return NextResponse.json(
        { error: "Unauthorized - Admin privileges required" },
        { status: 403 }
      )
    }
    
    // Create a Supabase admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    
    // Fetch all users with admin client
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, email, created_at, is_admin, is_seller, license_image, is_disabled")
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: `Failed to fetch users: ${error.message}` },
        { status: 500 }
      )
    }
    
    // Check if the current user should be an admin but isn't
    const currentUser = data.find(user => user.id === session.user.id)
    if (currentUser && 
      AUTHORIZED_ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) && 
      !currentUser.is_admin) {
      
      // Update the user to be an admin
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", currentUser.id)
      
      if (updateError) {
        console.error('Error updating admin status:', updateError)
      } else {
        // Update the user in the result set
        currentUser.is_admin = true
      }
    }
    
    return NextResponse.json({ 
      users: data,
      count: data.length
    })
    
  } catch (error) {
    console.error('Error in users endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 