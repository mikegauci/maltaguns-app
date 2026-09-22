import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { normalisePersonalItemImages } from '@/lib/armory/personal-items'

export async function GET() {
  const auth = await requireAuthenticatedUser()
  if ('error' in auth) return auth.error

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_personal_items')
    .select('*')
    .eq('profile_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const {
    item_type,
    make,
    model,
    calibre,
    serial_number,
    acquisition_date,
    notes,
    images,
  } = body

  if (!item_type) {
    return NextResponse.json(
      { error: 'Item type is required' },
      { status: 400 }
    )
  }

  const normalisedImages = normalisePersonalItemImages(images)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_personal_items')
    .insert({
      profile_id: auth.user.id,
      item_type,
      make: make ?? null,
      model: model ?? null,
      calibre: calibre ?? null,
      serial_number: serial_number ?? null,
      acquisition_date: acquisition_date ?? null,
      notes: notes ?? null,
      images: normalisedImages,
      image_url: normalisedImages[0] ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}
