import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { StatusBadge } from '@/components/armory/status-badge'
import { ActionButton } from '@/components/armory/action-form'
import { requireDealerAccount } from '@/lib/armory/auth'
import { daysSince, fmtDate } from '@/lib/armory/format'
import { listTrash, TRASH_RETENTION_DAYS } from '@/lib/armory/queries'
import { restoreItem, purgeOldTrash } from '@/lib/armory/actions/items'
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

export default async function BinPage() {
  const ctx = await requireDealerAccount()
  await purgeOldTrash(ctx.dealerAccount.id)
  const items = await listTrash(ctx.dealerAccount.id)

  return (
    <ProfilePageLayout
      title="Bin"
      description={`Deleted items can be restored within ${TRASH_RETENTION_DAYS} days.`}
    >
      <SectionCard title={`Deleted items (${items.length})`}>
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing in the bin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Make / model</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(i => {
                  const daysLeft = i.deletedAt
                    ? Math.max(0, TRASH_RETENTION_DAYS - daysSince(i.deletedAt))
                    : null
                  return (
                    <TableRow key={i.id} className="text-muted-foreground">
                      <TableCell>{TYPE_LABEL[i.itemType]}</TableCell>
                      <TableCell>
                        {[i.make, i.model].filter(Boolean).join(' ') ||
                          '(unnamed)'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {i.serialNumber ?? '—'}
                      </TableCell>
                      <TableCell>{i.shipmentReference}</TableCell>
                      <TableCell>
                        {fmtDate(i.deletedAt)}
                        {daysLeft !== null && daysLeft <= 5 && (
                          <StatusBadge tone="amber" className="ml-1">
                            {daysLeft}d left
                          </StatusBadge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ActionButton
                          small
                          action={restoreItem.bind(null, i.id)}
                        >
                          Restore
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </ProfilePageLayout>
  )
}
