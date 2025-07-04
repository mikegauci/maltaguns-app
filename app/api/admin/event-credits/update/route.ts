import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a direct Supabase client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function PATCH(req: NextRequest) {
  try {
    // Parse request body
    const { user_id, created_at, amount } = await req.json()

    // Validate required fields
    if (!user_id || !created_at) {
      return NextResponse.json(
        {
          message:
            'User ID and created_at are required to identify the event credit',
        },
        { status: 400 }
      )
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) < 0) {
      return NextResponse.json(
        { message: 'A valid non-negative amount is required' },
        { status: 400 }
      )
    }

    // Check if event credit record exists
    const { data: eventCreditExists, error: eventCreditError } =
      await supabaseAdmin
        .from('credits_events')
        .select('*')
        .eq('user_id', user_id)
        .eq('created_at', created_at)
        .single()

    if (eventCreditError || !eventCreditExists) {
      return NextResponse.json(
        { message: 'Event credit record not found' },
        { status: 404 }
      )
    }

    // Update the event credit record
    const { data, error } = await supabaseAdmin
      .from('credits_events')
      .update({
        amount: Number(amount),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id)
      .eq('created_at', created_at)
      .select()

    if (error) {
      return NextResponse.json(
        { message: 'Failed to update event credits', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Event credits updated successfully',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
