import { NextResponse } from 'next/server'
import { requireApprovedDealer } from '@/lib/armory/auth'
import { getShipment, listItemsForShipment } from '@/lib/armory/queries'
import { buildItemsWorkbook } from '@/lib/armory/export'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requireApprovedDealer()
  const shipment = await getShipment(ctx.dealerAccount.id, id)
  if (!shipment) return new NextResponse('Not found', { status: 404 })
  const items = await listItemsForShipment(ctx.dealerAccount.id, id)
  const buf = await buildItemsWorkbook(items, shipment.reference)
  const safeName = shipment.reference.replace(/[^\w.-]+/g, '_')
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
    },
  })
}
