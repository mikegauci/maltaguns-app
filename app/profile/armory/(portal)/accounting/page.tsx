import Link from 'next/link'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { StatCard } from '@/components/armory/stat-card'
import { StatusBadge } from '@/components/armory/status-badge'
import { requireDealerAccount } from '@/lib/armory/auth'
import {
  listShipments,
  listItemsForShipment,
  listCosts,
} from '@/lib/armory/queries'
import {
  summariseShipment,
  eur,
  ALLOCATION_METHODS,
  allocateShipment,
  itemEconomics,
} from '@/lib/armory/accounting'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const BASE = '/profile/armory'

export default async function AccountingPage() {
  const ctx = await requireDealerAccount()
  const account = ctx.dealerAccount
  const shipments = await listShipments(account.id)
  const method = account.shippingAllocationMethod

  const rows = await Promise.all(
    shipments.map(async s => {
      const items = await listItemsForShipment(account.id, s.id)
      const costs = await listCosts(s.id)
      return {
        summary: summariseShipment(s, items, costs, method),
        items,
        costs,
      }
    })
  )

  const tot = rows.reduce(
    (a, r) => ({
      acquisition: a.acquisition + r.summary.acquisition,
      costs: a.costs + r.summary.shippingCosts,
      revenue: a.revenue + r.summary.revenue,
      profit: a.profit + r.summary.profit,
      outstanding: a.outstanding + r.summary.outstanding,
      stock: a.stock + r.summary.unsoldCost,
    }),
    {
      acquisition: 0,
      costs: 0,
      revenue: 0,
      profit: 0,
      outstanding: 0,
      stock: 0,
    }
  )

  const sold = rows.flatMap(r => {
    const alloc = allocateShipment(r.items, r.costs, method)
    return r.items
      .filter(i => i.currentHolderType === 'BUYER')
      .map(i => ({
        item: i,
        e: itemEconomics(i, alloc.get(i.id) ?? 0),
        ref: r.summary.shipment.reference,
      }))
  })

  return (
    <ProfilePageLayout
      title="Accounting"
      description="Shipment economics, margins, and outstanding balances"
    >
      <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <StatCard label="Items bought" value={eur(tot.acquisition)} />
        <StatCard label="Shipping & fees" value={eur(tot.costs)} />
        <StatCard label="Total cost" value={eur(tot.acquisition + tot.costs)} />
        <StatCard label="Revenue" value={eur(tot.revenue)} />
        <StatCard
          label="Profit (sold + stock at cost)"
          value={eur(tot.profit)}
          tone={tot.profit >= 0 ? 'good' : 'bad'}
          sub={`${eur(tot.stock)} of cost still in stock`}
        />
        <StatCard
          label="Owed by buyers"
          value={eur(tot.outstanding)}
          tone={tot.outstanding > 0 ? 'bad' : undefined}
        />
      </section>
      <p className="text-xs text-muted-foreground">
        Shipment costs are allocated using{' '}
        <strong>
          {ALLOCATION_METHODS.find(m => m.value === method)?.label}
        </strong>{' '}
        — change this in your{' '}
        <Link href={`${BASE}/company-profile`} className="underline">
          company profile
        </Link>
        .
      </p>

      <SectionCard title="By shipment">
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No shipments yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Bought</TableHead>
                  <TableHead>Costs</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Owed</TableHead>
                  <TableHead>In stock (cost)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ summary: s }) => (
                  <TableRow key={s.shipment.id}>
                    <TableCell>
                      <Link
                        href={`${BASE}/shipments/${s.shipment.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.shipment.reference}
                      </Link>
                    </TableCell>
                    <TableCell>{s.itemCount}</TableCell>
                    <TableCell className="tabular-nums">
                      {eur(s.acquisition)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {eur(s.shippingCosts)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {eur(s.revenue)}
                    </TableCell>
                    <TableCell
                      className={`tabular-nums ${s.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {eur(s.profit)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {eur(s.outstanding)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {eur(s.unsoldCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Sold items — margin per item">
        {sold.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing assigned to a buyer yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Shipment</TableHead>
                  <TableHead>Total cost</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sold.map(({ item: i, e, ref }) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Link
                        href={`${BASE}/inventory/${i.id}`}
                        className="hover:underline"
                      >
                        {[i.make, i.model].filter(Boolean).join(' ')}
                      </Link>
                    </TableCell>
                    <TableCell>{i.buyerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ref}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {eur(e.totalCost)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {eur(e.revenue)}
                    </TableCell>
                    <TableCell
                      className={`tabular-nums ${e.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {eur(e.profit)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={
                          i.paymentStatus === 'PAID'
                            ? 'green'
                            : i.paymentStatus === 'PARTIAL'
                              ? 'amber'
                              : 'red'
                        }
                      >
                        {i.paymentStatus}
                      </StatusBadge>
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
