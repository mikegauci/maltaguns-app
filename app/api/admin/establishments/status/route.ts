import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { id, type, status } = await req.json()

    if (!id || !type || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, type, status' },
        { status: 400 }
      )
    }

    if (!['store', 'club', 'servicing', 'range'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid establishment type' },
        { status: 400 }
      )
    }

    if (!['active', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be active or rejected' },
        { status: 400 }
      )
    }

    const tableName = type === 'servicing' ? 'servicing' : `${type}s`

    const { data: current, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Establishment not found' },
        { status: 404 }
      )
    }

    if (status === 'rejected' && current.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending establishments can be rejected' },
        { status: 400 }
      )
    }

    if (
      status === 'active' &&
      current.status !== 'pending' &&
      current.status !== 'rejected'
    ) {
      return NextResponse.json(
        { error: 'Only pending or rejected establishments can be approved' },
        { status: 400 }
      )
    }

    if (current.status === status) {
      return NextResponse.json(
        { error: `Establishment is already ${status}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Failed to update status: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      establishment: data,
      message:
        status === 'active'
          ? 'Establishment approved and is now live'
          : 'Establishment rejected',
    })
  } catch (error) {
    console.error('Error updating establishment status:', error)
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
