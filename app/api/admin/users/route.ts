import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Create a regular Supabase client to check authorization
    const supabase = createRouteHandlerClient({ cookies })

    // Check if the user is authorized
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

    // Get the user's profile to check if they are an admin
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profileData || !profileData.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin privileges required' },
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
      .from('profiles')
      .select(
        'id, username, email, created_at, is_admin, is_seller, is_verified, license_image, id_card_image, id_card_verified, is_disabled, first_name, last_name, notes'
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: `Failed to fetch users: ${error.message}` },
        { status: 500 }
      )
    }

    // Fetch establishments and associate with users
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('owner_id, business_name')

    const { data: clubs } = await supabaseAdmin
      .from('clubs')
      .select('owner_id, business_name')

    const { data: servicing } = await supabaseAdmin
      .from('servicing')
      .select('owner_id, name')

    const { data: ranges } = await supabaseAdmin
      .from('ranges')
      .select('owner_id, business_name')

    // Create a map of user IDs to their establishments
    const userEstablishments = new Map()

    stores?.forEach(store => {
      if (!userEstablishments.has(store.owner_id)) {
        userEstablishments.set(store.owner_id, [])
      }
      userEstablishments
        .get(store.owner_id)
        .push({ type: 'store', name: store.business_name })
    })

    clubs?.forEach(club => {
      if (!userEstablishments.has(club.owner_id)) {
        userEstablishments.set(club.owner_id, [])
      }
      userEstablishments
        .get(club.owner_id)
        .push({ type: 'club', name: club.business_name })
    })

    servicing?.forEach(service => {
      if (!userEstablishments.has(service.owner_id)) {
        userEstablishments.set(service.owner_id, [])
      }
      userEstablishments
        .get(service.owner_id)
        .push({ type: 'servicing', name: service.name })
    })

    ranges?.forEach(range => {
      if (!userEstablishments.has(range.owner_id)) {
        userEstablishments.set(range.owner_id, [])
      }
      userEstablishments
        .get(range.owner_id)
        .push({ type: 'range', name: range.business_name })
    })

    // Fetch users who have purchased credits
    const { data: credits } = await supabaseAdmin
      .from('credits')
      .select('user_id, amount')

    // Create a map of user IDs to their credit information
    const userCredits = new Map()
    credits?.forEach(credit => {
      userCredits.set(credit.user_id, credit.amount)
    })

    // Add establishment data and credit info to users
    const usersWithData = data.map(user => {
      return {
        ...user,
        establishments: userEstablishments.get(user.id) || [],
        purchasedBefore: userCredits.has(user.id),
        creditAmount: userCredits.get(user.id) || 0,
      }
    })

    return NextResponse.json({
      users: usersWithData,
      count: data.length,
    })
  } catch (error) {
    console.error('Error in users endpoint:', error)
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
