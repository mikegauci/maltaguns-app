import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { id, type } = await req.json()

    if (!id || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: id, type' },
        { status: 400 }
      )
    }

    if (!['store', 'club', 'servicing', 'range'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid establishment type' },
        { status: 400 }
      )
    }

    const table = type === 'servicing' ? 'servicing' : `${type}s`

    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('[ADMIN DELETE ESTABLISHMENT] Fetch error:', fetchError)
      return NextResponse.json(
        { error: `Failed to look up establishment: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Establishment not found' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[ADMIN DELETE ESTABLISHMENT] Delete error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete establishment: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Establishment deleted successfully',
    })
  } catch (error) {
    console.error('[ADMIN DELETE ESTABLISHMENT] Unexpected error:', error)
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
