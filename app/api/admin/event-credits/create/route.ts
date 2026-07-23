import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { user_id, amount } = await req.json()

    if (!user_id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) < 0) {
      return NextResponse.json(
        { message: 'A valid non-negative amount is required' },
        { status: 400 }
      )
    }

    const { data: userExists, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single()

    if (userError || !userExists) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('credits_events')
      .insert({
        user_id,
        amount: Number(amount),
      })
      .select()

    if (error) {
      return NextResponse.json(
        { message: 'Failed to add event credits', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Event credits added successfully',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
