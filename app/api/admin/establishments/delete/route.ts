import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    // Regular client for authentication
    const supabase = createRouteHandlerClient({ cookies })

    // Service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify admin session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (!profileData?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

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

    // Verify the record exists before attempting to delete it
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

    // Delete using the service role client so RLS can't silently no-op the delete
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
