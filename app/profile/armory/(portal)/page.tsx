import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireArmoryContext } from '@/lib/armory/auth'
import {
  getDashboardStats,
  listDueCommissionerNotices,
  listShipments,
  SHIPMENT_STATUSES,
} from '@/lib/armory/queries'
import { createShipment } from '@/lib/armory/actions/shipments'
import { markCommissionerNotified } from '@/lib/armory/actions/items'
import { ActionForm, ActionButton } from '@/components/armory/action-form'
import {
  Card,
  Input,
  Badge,
  SHIPMENT_STATUS_TONE,
  Table,
  th,
  td,
  Empty,
  fmtDate,
  Stat,
} from '@/components/armory/ui'

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
    <>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Firearms & items in stock" value={stats.inStock} />
        <Stat label="Reserved for buyers" value={stats.reserved} />
        <Stat label="Pending transfer" value={stats.pending} />
        <Stat
          label="Unpaid buyer balances"
          value={stats.unpaid}
          tone={stats.unpaid ? 'bad' : undefined}
        />
      </section>

      {dueNotices.length > 0 && (
        <Card
          title="Commissioner notifications due"
          description="Arms Act art. 20: the transferor must inform the Commissioner of Police within 15 days of a transfer."
        >
          <ul className="divide-y">
            {dueNotices.map(n => {
              const left = 15 - n.daysSinceTransfer
              return (
                <li
                  key={n.id}
                  className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm"
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
                    <Badge
                      tone={left < 0 ? 'red' : left <= 5 ? 'amber' : 'neutral'}
                    >
                      {left < 0 ? `${-left} days overdue` : `${left} days left`}
                    </Badge>
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
        </Card>
      )}

      <Card
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
                className="!w-48"
              />
            </ActionForm>
          )
        }
      >
        {shipments.length === 0 ? (
          <Empty>
            {approved
              ? 'No shipments yet — create the first one above, or import an existing spreadsheet.'
              : 'Shipments unlock once your account is approved.'}
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Reference</th>
                <th className={th}>Status</th>
                <th className={th}>Origin</th>
                <th className={th}>Items</th>
                <th className={th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map(s => (
                <tr key={s.id} className="hover:bg-muted/50">
                  <td className={td}>
                    <Link
                      href={`${BASE}/shipments/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.reference}
                    </Link>
                  </td>
                  <td className={td}>
                    <Badge tone={SHIPMENT_STATUS_TONE[s.status]}>
                      {SHIPMENT_STATUSES.find(x => x.value === s.status)
                        ?.label ?? s.status}
                    </Badge>
                  </td>
                  <td className={td + ' text-muted-foreground'}>
                    {s.senderCompanyName ??
                      ([s.senderFirstNames, s.senderSurname]
                        .filter(Boolean)
                        .join(' ') ||
                        '—')}
                  </td>
                  <td className={td}>
                    {s.itemCount}{' '}
                    <span className="text-muted-foreground">
                      ({s.firearmCount} firearms)
                    </span>
                  </td>
                  <td className={td + ' text-muted-foreground'}>
                    {fmtDate(s.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
