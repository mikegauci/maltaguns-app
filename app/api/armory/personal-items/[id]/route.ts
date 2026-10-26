import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { normalisePersonalItemImages } from '@/lib/armory/personal-items'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuthenticatedUser()
  if ('error' in auth) return auth.error

  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_personal_items')
    .select('*')
    .eq('id', id)
    .eq('profile_id', auth.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuthenticatedUser()
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = await req.json()
  const normalisedImages = normalisePersonalItemImages(body.images)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_personal_items')
    .update({
      item_type: body.item_type,
      make: body.make ?? null,
      model: body.model ?? null,
      calibre: body.calibre ?? null,
      serial_number: body.serial_number ?? null,
      acquisition_date: body.acquisition_date ?? null,
      notes: body.notes ?? null,
      images: normalisedImages,
      image_url: normalisedImages[0] ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('profile_id', auth.user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json({ item: data })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuthenticatedUser()
  if ('error' in auth) return auth.error

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('armory_personal_items')
    .delete()
    .eq('id', id)
    .eq('profile_id', auth.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
