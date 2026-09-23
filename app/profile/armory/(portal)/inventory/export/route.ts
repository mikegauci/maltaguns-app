import { NextResponse } from 'next/server'
import { requireApprovedDealer } from '@/lib/armory/auth'
import { listAllItems } from '@/lib/armory/queries'
import { buildItemsWorkbook } from '@/lib/armory/export'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ctx = await requireApprovedDealer()
  const url = new URL(req.url)
  const filter = {
    q: url.searchParams.get('q') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    itemType: url.searchParams.get('itemType') ?? undefined,
  }
  const items = await listAllItems(ctx.dealerAccount.id, filter)
  const buf = await buildItemsWorkbook(items, 'Inventory')
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inventory.xlsx"',
    },
  })
}
