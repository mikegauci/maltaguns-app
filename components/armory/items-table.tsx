'use client'

import Link from 'next/link'
import type { ItemRow, BuyerRow } from '@/lib/armory/types'
import {
  assignBuyer,
  markPendingTransferManual,
  markTransferred,
  cancelPendingTransfer,
  deleteItem,
} from '@/lib/armory/actions/items'
import { ActionButton, ActionForm } from '@/components/armory/action-form'
import { StatusBadge } from '@/components/armory/status-badge'
import { ITEM_STATUS_LABEL, ITEM_STATUS_TONE } from '@/lib/armory/status-tones'
import { eur } from '@/lib/armory/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const TYPE_LABEL: Record<string, string> = {
  FIREARM: 'Firearm',
  REGULATED_COMPONENT: 'Component',
  ACCESSORY: 'Accessory',
}

const BASE = '/profile/armory'

export function ItemsTable({
  items,
  showShipment,
  showEconomics,
  buyers = [],
}: {
  items: ItemRow[]
  showShipment?: boolean
  showEconomics?: boolean
  buyers?: BuyerRow[]
  firearmsOnly?: boolean
}) {
  if (items.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
        No items.
      </p>
    )
  }

  return (
    <div className="max-h-[65vh] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Make / model</TableHead>
            <TableHead>Serial</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Calibre</TableHead>
            <TableHead>Buyer</TableHead>
            <TableHead>Status</TableHead>
            {showShipment && <TableHead>Shipment</TableHead>}
            {showEconomics && <TableHead>Cost</TableHead>}
            {showEconomics && <TableHead>Sale</TableHead>}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(i => (
            <TableRow key={i.id}>
              <TableCell>
                <Link
                  href={`${BASE}/inventory/${i.id}`}
                  className="font-medium hover:underline"
                >
                  {[i.make, i.model].filter(Boolean).join(' ') || '(unnamed)'}
                </Link>
                {i.onHold && (
                  <StatusBadge tone="amber" className="ml-1">
                    hold
                  </StatusBadge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {i.serialNumber ?? '—'}
              </TableCell>
              <TableCell>{TYPE_LABEL[i.itemType] ?? i.itemType}</TableCell>
              <TableCell>{i.calibreDisplay ?? i.calibreRaw ?? '—'}</TableCell>
              <TableCell>{i.buyerName ?? '—'}</TableCell>
              <TableCell>
                <StatusBadge tone={ITEM_STATUS_TONE[i.status]}>
                  {ITEM_STATUS_LABEL[i.status] ?? i.status}
                </StatusBadge>
              </TableCell>
              {showShipment && (
                <TableCell>
                  {i.shipmentId ? (
                    <Link
                      href={`${BASE}/shipments/${i.shipmentId}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {i.shipmentReference}
                    </Link>
                  ) : (
                    '—'
                  )}
                </TableCell>
              )}
              {showEconomics && (
                <TableCell className="tabular-nums">
                  {eur(
                    (i.acquisitionPrice ?? 0) + (i.egunDomesticShippingFee ?? 0)
                  )}
                </TableCell>
              )}
              {showEconomics && (
                <TableCell className="tabular-nums">
                  {i.currentHolderType === 'BUYER'
                    ? eur((i.salePrice ?? 0) + (i.clientHandlingFee ?? 0))
                    : '—'}
                </TableCell>
              )}
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {i.status !== 'TRANSFERRED' && buyers.length > 0 && (
                    <ActionForm
                      inline
                      submitLabel="Assign"
                      variant="secondary"
                      action={async fd => {
                        const b = fd.get('buyerId')
                        return assignBuyer(i.id, b ? String(b) : null, fd)
                      }}
                    >
                      <select
                        name="buyerId"
                        defaultValue={i.currentHolderBuyerId ?? ''}
                        className="h-8 w-32 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="">Dealer stock</option>
                        {buyers.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.firstNames} {b.surname}
                          </option>
                        ))}
                      </select>
                    </ActionForm>
                  )}
                  {i.itemType === 'FIREARM' &&
                    i.currentHolderBuyerId &&
                    i.status !== 'TRANSFERRED' && (
                      <>
                        {i.status !== 'PENDING_TRANSFER' && (
                          <ActionButton
                            small
                            action={markPendingTransferManual.bind(null, i.id)}
                          >
                            Pending
                          </ActionButton>
                        )}
                        {i.status === 'PENDING_TRANSFER' && (
                          <>
                            <ActionButton
                              small
                              action={cancelPendingTransfer.bind(null, i.id)}
                            >
                              Cancel
                            </ActionButton>
                            <ActionForm
                              inline
                              submitLabel="Transferred"
                              action={markTransferred.bind(null, i.id)}
                              confirm="Confirm transfer approved by Weapons Office?"
                            >
                              <Input
                                name="transferredAt"
                                type="date"
                                className="h-8 w-32"
                                defaultValue={new Date()
                                  .toISOString()
                                  .slice(0, 10)}
                              />
                            </ActionForm>
                          </>
                        )}
                        {i.status !== 'PENDING_TRANSFER' && (
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`${BASE}/print/proforma?items=${i.id}`}
                              target="_blank"
                            >
                              Proforma
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                  {i.status !== 'TRANSFERRED' && (
                    <ActionButton
                      small
                      variant="danger"
                      action={deleteItem.bind(null, i.id)}
                      confirm="Move this item to the bin?"
                    >
                      Delete
                    </ActionButton>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
