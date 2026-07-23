import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { listingId } = await request.json()

    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, expires_at')
      .eq('id', listingId)
      .single()

    if (listingError) {
      return NextResponse.json(
        { error: `Error fetching listing: ${listingError.message}` },
        { status: 500 }
      )
    }

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const newExpiryDate = new Date()
    newExpiryDate.setDate(newExpiryDate.getDate() + 30)
    const newExpiryIso = newExpiryDate.toISOString()

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        expires_at: newExpiryIso,
      })
      .eq('id', listingId)
      .select('id, expires_at')

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update expiry: ${updateError.message}` },
        { status: 500 }
      )
    }

    if (!updateData || updateData.length === 0) {
      return NextResponse.json({ error: 'No rows updated' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Listing expiry updated successfully',
      listing: updateData[0],
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json(
      { error: `Unexpected error: ${message}` },
      { status: 500 }
    )
  }
}
