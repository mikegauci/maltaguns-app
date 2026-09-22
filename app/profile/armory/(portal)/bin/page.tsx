import { requireDealerAccount } from '@/lib/armory/auth'
import { daysSince } from '@/lib/armory/format'
import { listTrash, TRASH_RETENTION_DAYS } from '@/lib/armory/queries'
import { restoreItem, purgeOldTrash } from '@/lib/armory/actions/items'
import { ActionButton } from '@/components/armory/action-form'
import {
  Card,
  Table,
  th,
  td,
  Empty,
  fmtDate,
  Badge,
} from '@/components/armory/ui'

const TYPE_LABEL: Record<string, string> = {
  FIREARM: 'Firearm',
  REGULATED_COMPONENT: 'Component',
  ACCESSORY: 'Accessory',
}

export default async function BinPage() {
  const ctx = await requireDealerAccount()
  await purgeOldTrash(ctx.dealerAccount.id)
  const items = await listTrash(ctx.dealerAccount.id)

  return (
    <Card
      title={`Bin (${items.length})`}
      description={`Deleted items can be restored within ${TRASH_RETENTION_DAYS} days.`}
    >
      {items.length === 0 ? (
        <Empty>Nothing in the bin.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={th}>Type</th>
              <th className={th}>Make / model</th>
              <th className={th}>Serial</th>
              <th className={th}>Shipment</th>
              <th className={th}>Deleted</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => {
              const daysLeft = i.deletedAt
                ? Math.max(0, TRASH_RETENTION_DAYS - daysSince(i.deletedAt))
                : null
              return (
                <tr key={i.id} className="text-muted-foreground">
                  <td className={td}>{TYPE_LABEL[i.itemType]}</td>
                  <td className={td}>
                    {[i.make, i.model].filter(Boolean).join(' ') || '(unnamed)'}
                  </td>
                  <td className={td + ' font-mono text-xs'}>
                    {i.serialNumber ?? '—'}
                  </td>
                  <td className={td}>{i.shipmentReference}</td>
                  <td className={td}>
                    {fmtDate(i.deletedAt)}
                    {daysLeft !== null && daysLeft <= 5 && (
                      <Badge tone="amber" className="ml-1">
                        {daysLeft}d left
                      </Badge>
                    )}
                  </td>
                  <td className={td}>
                    <ActionButton small action={restoreItem.bind(null, i.id)}>
                      Restore
                    </ActionButton>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </Card>
  )
}
