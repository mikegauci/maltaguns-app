import { NextRequest, NextResponse } from 'next/server'
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

    console.log(
      'Create request received for user_id:',
      user_id,
      'with amount:',
      amount
    )

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { message: 'A valid positive amount is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: userExists, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single()

    console.log('User lookup result:', { userExists, userError })

    if (userError || !userExists) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const amountToAdd = Number(amount)

    // Each user can only have one row in `credits` (unique constraint on user_id).
    // If a row already exists, increment its amount; otherwise insert a new row.
    const { data: existingCredit, error: existingError } = await supabaseAdmin
      .from('credits')
      .select('id, amount')
      .eq('user_id', user_id)
      .maybeSingle()

    console.log('Existing credit lookup result:', {
      existingCredit,
      existingError,
    })

    if (existingError) {
      console.error('Error looking up existing credits:', existingError)
      return NextResponse.json(
        { message: 'Failed to add credits', error: existingError.message },
        { status: 500 }
      )
    }

    let data
    let error

    if (existingCredit) {
      const newAmount = Number(existingCredit.amount) + amountToAdd

      const updateResult = await supabaseAdmin
        .from('credits')
        .update({
          amount: newAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCredit.id)
        .select()

      data = updateResult.data
      error = updateResult.error
      console.log('Update result:', { data, error })
    } else {
      const insertResult = await supabaseAdmin
        .from('credits')
        .insert({
          user_id,
          amount: amountToAdd,
        })
        .select()

      data = insertResult.data
      error = insertResult.error
      console.log('Insert result:', { data, error })
    }

    if (error) {
      console.error('Error adding credits:', error)
      return NextResponse.json(
        { message: 'Failed to add credits', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Credits added successfully',
      data,
    })
  } catch (error) {
    console.error('Error in credits create:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
