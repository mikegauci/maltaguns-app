import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

// Create a direct Supabase client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { user_id, amount } = await req.json()
    
    console.log("Create request received for user_id:", user_id, "with amount:", amount);

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { message: "A valid positive amount is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: userExists, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single()
    
    console.log("User lookup result:", { userExists, userError });

    if (userError || !userExists) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Insert new credit record
    const { data, error } = await supabaseAdmin
      .from("credits")
      .insert({
        user_id,
        amount: Number(amount),
      })
      .select()
    
    console.log("Insert result:", { data, error });

    if (error) {
      console.error("Error adding credits:", error)
      return NextResponse.json(
        { message: "Failed to add credits", error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: "Credits added successfully", 
      data 
    })
  } catch (error) {
    console.error("Error in credits create:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
} 