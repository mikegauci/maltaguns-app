import { NextResponse } from 'next/server'
import { requireApprovedDealer } from '@/lib/armory/auth'
import { getItem } from '@/lib/armory/queries'
import { createClient } from '@/lib/supabase/server'
import { fetchEgunImageBlob, isSafeEgunImageName } from '@/lib/armory/egun'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; file: string }> }
) {
  const { id, file: rawFile } = await params
  const file = decodeURIComponent(rawFile)
  if (!isSafeEgunImageName(file)) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const ctx = await requireApprovedDealer()
  const item = await getItem(ctx.dealerAccount.id, id)
  if (!item) return new NextResponse('Not found', { status: 404 })

  const supabase = await createClient()
  const image = await fetchEgunImageBlob(
    supabase,
    ctx.dealerAccount.id,
    id,
    file
  )
  if (!image) return new NextResponse('Not found', { status: 404 })

  return new NextResponse(await image.blob.arrayBuffer(), {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
