import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { id, amount } = await req.json()

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

    const { data: creditExists, error: creditError } = await supabaseAdmin
      .from('credits')
      .select('id')
      .eq('id', id)
      .single()

    if (creditError || !creditExists) {
      return NextResponse.json(
        { message: 'Credit record not found' },
        { status: 404 }
      )
    }

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
