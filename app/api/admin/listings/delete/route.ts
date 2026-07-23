import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { deleteListingCascade } from '@/lib/listing-delete'

export async function POST(request: Request) {
  try {
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    console.log(
      '[ADMIN DELETE API] Admin attempting to delete listing:',
      listingId
    )

    const { error: listingError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single()

    if (listingError) {
      console.error('[ADMIN DELETE API] Error finding listing:', listingError)
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    console.log('[ADMIN DELETE API] Beginning cascading delete...')

    const result = await deleteListingCascade(listingId, {
      logPrefix: '[ADMIN DELETE API]',
    })

    if ('error' in result) {
      return NextResponse.json(
        { error: 'Failed to delete listing', details: result.error },
        { status: 500 }
      )
    }

    console.log('[ADMIN DELETE API] Listing deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    })
  } catch (error) {
    console.error('[ADMIN DELETE API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
