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

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { message: 'A valid positive amount is required' },
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

    const amountToAdd = Number(amount)

    const { data: existingCredit, error: existingError } = await supabaseAdmin
      .from('credits')
      .select('id, amount')
      .eq('user_id', user_id)
      .maybeSingle()

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
