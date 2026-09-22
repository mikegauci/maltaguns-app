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
import {
  Badge,
  ITEM_STATUS_LABEL,
  ITEM_STATUS_TONE,
  Table,
  th,
  td,
  Empty,
} from '@/components/armory/ui'
import { ActionButton, ActionForm } from '@/components/armory/action-form'
import { Input, Select } from '@/components/armory/ui'
import { eur } from '@/lib/armory/format'
import { Button } from '@/components/ui/button'

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
  if (items.length === 0) return <Empty>No items.</Empty>

  return (
    <Table scroll>
      <thead>
        <tr>
          <th className={th}>Make / model</th>
          <th className={th}>Serial</th>
          <th className={th}>Type</th>
          <th className={th}>Calibre</th>
          <th className={th}>Buyer</th>
          <th className={th}>Status</th>
          {showShipment && <th className={th}>Shipment</th>}
          {showEconomics && <th className={th}>Cost</th>}
          {showEconomics && <th className={th}>Sale</th>}
          <th className={th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map(i => (
          <tr key={i.id} className="hover:bg-muted/50">
            <td className={td}>
              <Link
                href={`${BASE}/inventory/${i.id}`}
                className="font-medium hover:underline"
              >
                {[i.make, i.model].filter(Boolean).join(' ') || '(unnamed)'}
              </Link>
              {i.onHold && (
                <Badge tone="amber" className="ml-1">
                  hold
                </Badge>
              )}
            </td>
            <td className={td + ' font-mono text-xs'}>
              {i.serialNumber ?? '—'}
            </td>
            <td className={td}>{TYPE_LABEL[i.itemType] ?? i.itemType}</td>
            <td className={td}>{i.calibreDisplay ?? i.calibreRaw ?? '—'}</td>
            <td className={td}>{i.buyerName ?? '—'}</td>
            <td className={td}>
              <Badge tone={ITEM_STATUS_TONE[i.status]}>
                {ITEM_STATUS_LABEL[i.status] ?? i.status}
              </Badge>
            </td>
            {showShipment && (
              <td className={td}>
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
              </td>
            )}
            {showEconomics && (
              <td className={td + ' tabular-nums'}>
                {eur(
                  (i.acquisitionPrice ?? 0) + (i.egunDomesticShippingFee ?? 0)
                )}
              </td>
            )}
            {showEconomics && (
              <td className={td + ' tabular-nums'}>
                {i.currentHolderType === 'BUYER'
                  ? eur((i.salePrice ?? 0) + (i.clientHandlingFee ?? 0))
                  : '—'}
              </td>
            )}
            <td className={td}>
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
                    <Select
                      name="buyerId"
                      defaultValue={i.currentHolderBuyerId ?? ''}
                      className="!w-32 !h-8 !text-xs"
                    >
                      <option value="">Dealer stock</option>
                      {buyers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.firstNames} {b.surname}
                        </option>
                      ))}
                    </Select>
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
                              className="!w-32 !h-8"
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
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
