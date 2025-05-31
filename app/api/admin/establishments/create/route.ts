import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
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
    
    // Get the user's profile to check if they are an admin
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

    // Parse request body
    const { owner_id, type, name, location, email, phone, description, website, logo_url } = await req.json()

    if (!owner_id || !type || !name || !location) {
      return NextResponse.json(
        { error: "Missing required fields: owner_id, type, name, location" },
        { status: 400 }
      )
    }

    // Validate establishment type
    if (!['store', 'club', 'servicing', 'range'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid establishment type" },
        { status: 400 }
      )
    }

    // Create a Supabase admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Verify the owner exists
    const { data: ownerProfile, error: ownerError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, email")
      .eq("id", owner_id)
      .single()

    if (ownerError || !ownerProfile) {
      return NextResponse.json(
        { error: "Owner not found" },
        { status: 404 }
      )
    }

    // Create slug from business name
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")

    // Determine table name
    const tableName = type === 'servicing' ? 'servicing' : `${type}s`

    // Prepare establishment data based on table type
    // Base fields that exist in all tables
    const baseData = {
      business_name: name,
      location,
      owner_id,
      slug,
      email: email || '',
      phone: phone || '',
      description: description || null,
      website: website || null,
      logo_url: logo_url || null,
    }

    // Insert new establishment
    const { data: newEstablishment, error: insertError } = await supabaseAdmin
      .from(tableName)
      .insert(baseData)
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json(
        { error: `Failed to create establishment: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      establishment: newEstablishment,
      message: `${getTypeLabel(type)} created successfully and assigned to ${ownerProfile.username}`
    })

  } catch (error) {
    console.error('Error in create establishment endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'store':
      return 'Store'
    case 'club':
      return 'Club'
    case 'servicing':
      return 'Servicing'
    case 'range':
      return 'Range'
    default:
      return type
  }
} 