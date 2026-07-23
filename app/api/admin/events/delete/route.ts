import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    console.log('[ADMIN DELETE API] Admin attempting to delete event:', eventId)

    // First verify that the event exists (admin can delete any event)
    const { error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('[ADMIN DELETE API] Error finding event:', eventError)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    console.log('[ADMIN DELETE API] Beginning event deletion...')

    // Delete the event
    const { error: deleteError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', eventId)

    if (deleteError) {
      console.error('[ADMIN DELETE API] Error deleting event:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete event', details: deleteError },
        { status: 500 }
      )
    }

    console.log('[ADMIN DELETE API] Event deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    console.error('[ADMIN DELETE API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
