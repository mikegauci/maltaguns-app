import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { StatCard } from '@/components/armory/stat-card'
import { StatusBadge } from '@/components/armory/status-badge'
import { ActionForm, ActionButton } from '@/components/armory/action-form'
import { requireArmoryContext } from '@/lib/armory/auth'
import { fmtDate } from '@/lib/armory/format'
import { SHIPMENT_STATUS_TONE } from '@/lib/armory/status-tones'
import {
  getDashboardStats,
  listDueCommissionerNotices,
  listShipments,
  SHIPMENT_STATUSES,
} from '@/lib/armory/queries'
import { createShipment } from '@/lib/armory/actions/shipments'
import { markCommissionerNotified } from '@/lib/armory/actions/items'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const BASE = '/profile/armory'

export default async function ArmoryDashboardPage() {
  const ctx = await requireArmoryContext()
  if (!ctx.dealerAccount) redirect(`${BASE}/inventory`)

  const account = ctx.dealerAccount
  const approved = ctx.isApproved
  const [shipments, stats, dueNotices] = await Promise.all([
    listShipments(account.id),
    getDashboardStats(account.id),
    listDueCommissionerNotices(account.id),
  ])

  return (
    <ProfilePageLayout
      title="Shipments"
      description={`${account.companyName} · ${ctx.staffRole === 'owner' ? 'Owner' : 'Staff'} · Licence ${account.dealerLicenceNumber ?? '—'}`}
    >
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Firearms & items in stock" value={stats.inStock} />
        <StatCard label="Reserved for buyers" value={stats.reserved} />
        <StatCard label="Pending transfer" value={stats.pending} />
        <StatCard
          label="Unpaid buyer balances"
          value={stats.unpaid}
          tone={stats.unpaid ? 'bad' : undefined}
        />
      </section>

      {dueNotices.length > 0 && (
        <SectionCard
          title="Commissioner notifications due"
          description="Arms Act art. 20: the transferor must inform the Commissioner of Police within 15 days of a transfer."
        >
          <ul className="divide-y">
            {dueNotices.map(n => {
              const left = 15 - n.daysSinceTransfer
              return (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span>
                    <Link
                      href={`${BASE}/inventory/${n.id}`}
                      className="font-medium hover:underline"
                    >
                      {n.make} {n.model}
                    </Link>{' '}
                    <span className="text-muted-foreground">
                      s/n {n.serialNumber ?? '—'} → {n.buyerName ?? 'buyer'} ·
                      transferred {fmtDate(n.transferredAt)}
                    </span>{' '}
                    <StatusBadge
                      tone={left < 0 ? 'red' : left <= 5 ? 'amber' : 'neutral'}
                    >
                      {left < 0 ? `${-left} days overdue` : `${left} days left`}
                    </StatusBadge>
                  </span>
                  <ActionButton
                    small
                    action={markCommissionerNotified.bind(null, n.id)}
                  >
                    Mark as notified
                  </ActionButton>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title="Shipments"
        description="A shipment is one box from one origin dealer. Items, the Prior Consent, quotes and costs all hang off it."
        actions={
          approved && (
            <ActionForm
              action={createShipment}
              submitLabel="New shipment"
              inline
            >
              <Input
                name="reference"
                placeholder="e.g. Shipment 64"
                required
                className="w-48"
              />
            </ActionForm>
          )
        }
      >
        {shipments.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {approved
              ? 'No shipments yet — create the first one above, or import an existing spreadsheet.'
              : 'Shipments unlock once your account is approved.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={`${BASE}/shipments/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.reference}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={SHIPMENT_STATUS_TONE[s.status]}>
                        {SHIPMENT_STATUSES.find(x => x.value === s.status)
                          ?.label ?? s.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.senderCompanyName ??
                        ([s.senderFirstNames, s.senderSurname]
                          .filter(Boolean)
                          .join(' ') ||
                          '—')}
                    </TableCell>
                    <TableCell>
                      {s.itemCount}{' '}
                      <span className="text-muted-foreground">
                        ({s.firearmCount} firearms)
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDate(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </ProfilePageLayout>
  )
}
