import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { user_id, created_at, amount } = await req.json()

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
