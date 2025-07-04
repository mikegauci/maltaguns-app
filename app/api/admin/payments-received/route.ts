import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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
    
    // Create a Supabase admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    
    // Fetch all credit transactions with admin client
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from("credit_transactions")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: `Failed to fetch transactions: ${transactionsError.message}` },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ 
        payments: [],
        count: 0
      })
    }
    
    // Get unique user IDs for profile lookup
    const userIds = Array.from(new Set(transactions.map(t => t.user_id)))
    
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, email, first_name, last_name")
      .in("id", userIds)
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      // Continue without user data if profiles fail
    }
    
    // Create a map of user IDs to profiles for quick lookup
    const userProfileMap = new Map()
    profiles?.forEach(profile => {
      userProfileMap.set(profile.id, profile)
    })
    
    // Combine transaction data with user information
    const paymentsWithUserInfo = transactions.map(transaction => {
      const userProfile = userProfileMap.get(transaction.user_id)
      return {
        id: transaction.id,
        user_id: transaction.user_id,
        username: userProfile?.username || 'Unknown',
        email: userProfile?.email || 'Unknown',
        first_name: userProfile?.first_name || '',
        last_name: userProfile?.last_name || '',
        amount: transaction.amount,
        type: transaction.type,
        credit_type: transaction.credit_type,
        stripe_payment_id: transaction.stripe_payment_id,
        status: transaction.status,
        description: transaction.description,
        created_at: transaction.created_at
      }
    })
    
    return NextResponse.json({ 
      payments: paymentsWithUserInfo,
      count: paymentsWithUserInfo.length
    })
    
  } catch (error) {
    console.error('Error in payments-received endpoint:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 