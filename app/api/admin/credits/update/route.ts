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
    const { id, amount } = await req.json()

    console.log('Update request received for ID:', id, 'with amount:', amount)

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { message: 'Credit ID is required' },
        { status: 400 }
      )
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { message: 'A valid positive amount is required' },
        { status: 400 }
      )
    }

    // Check if credit record exists
    const { data: creditExists, error: creditError } = await supabaseAdmin
      .from('credits')
      .select('id')
      .eq('id', id)
      .single()

    console.log('Credit lookup result:', { creditExists, creditError })

    if (creditError || !creditExists) {
      return NextResponse.json(
        { message: 'Credit record not found' },
        { status: 404 }
      )
    }

    // Update the credit record
    const { data, error } = await supabaseAdmin
      .from('credits')
      .update({
        amount: Number(amount),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating credits:', error)
      return NextResponse.json(
        { message: 'Failed to update credits', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Credits updated successfully',
      data,
    })
  } catch (error) {
    console.error('Error in credits update:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
