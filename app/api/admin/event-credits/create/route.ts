import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { addOrIncrementCredits, ensureUserExists } from '@/lib/admin-credits'

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

    const userCheck = await ensureUserExists(supabaseAdmin, user_id)
    if ('error' in userCheck) {
      return NextResponse.json(
        { message: userCheck.error },
        { status: userCheck.status }
      )
    }

    const { data, error } = await addOrIncrementCredits(supabaseAdmin, {
      table: 'credits_events',
      userId: user_id,
      amount: Number(amount),
      incrementExisting: false,
    })

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
