import Link from 'next/link'
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
import { Card, Table, th, td, Stat, Empty, Badge } from '@/components/armory/ui'

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
    <>
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Items bought" value={eur(tot.acquisition)} />
        <Stat label="Shipping & fees" value={eur(tot.costs)} />
        <Stat label="Total cost" value={eur(tot.acquisition + tot.costs)} />
        <Stat label="Revenue" value={eur(tot.revenue)} />
        <Stat
          label="Profit (sold + stock at cost)"
          value={eur(tot.profit)}
          tone={tot.profit >= 0 ? 'good' : 'bad'}
          sub={`${eur(tot.stock)} of cost still in stock`}
        />
        <Stat
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
        <Link href={`${BASE}/profile`} className="underline">
          company profile
        </Link>
        .
      </p>

      <Card title="By shipment">
        {rows.length === 0 ? (
          <Empty>No shipments yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Shipment</th>
                <th className={th}>Items</th>
                <th className={th}>Bought</th>
                <th className={th}>Costs</th>
                <th className={th}>Revenue</th>
                <th className={th}>Profit</th>
                <th className={th}>Owed</th>
                <th className={th}>In stock (cost)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ summary: s }) => (
                <tr key={s.shipment.id}>
                  <td className={td}>
                    <Link
                      href={`${BASE}/shipments/${s.shipment.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.shipment.reference}
                    </Link>
                  </td>
                  <td className={td}>{s.itemCount}</td>
                  <td className={td + ' tabular-nums'}>{eur(s.acquisition)}</td>
                  <td className={td + ' tabular-nums'}>
                    {eur(s.shippingCosts)}
                  </td>
                  <td className={td + ' tabular-nums'}>{eur(s.revenue)}</td>
                  <td
                    className={
                      td +
                      ' tabular-nums ' +
                      (s.profit >= 0 ? 'text-emerald-600' : 'text-red-600')
                    }
                  >
                    {eur(s.profit)}
                  </td>
                  <td className={td + ' tabular-nums'}>{eur(s.outstanding)}</td>
                  <td className={td + ' tabular-nums'}>{eur(s.unsoldCost)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Sold items — margin per item">
        {sold.length === 0 ? (
          <Empty>Nothing assigned to a buyer yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Item</th>
                <th className={th}>Buyer</th>
                <th className={th}>Shipment</th>
                <th className={th}>Total cost</th>
                <th className={th}>Revenue</th>
                <th className={th}>Margin</th>
                <th className={th}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {sold.map(({ item: i, e, ref }) => (
                <tr key={i.id}>
                  <td className={td}>
                    <Link
                      href={`${BASE}/inventory/${i.id}`}
                      className="hover:underline"
                    >
                      {[i.make, i.model].filter(Boolean).join(' ')}
                    </Link>
                  </td>
                  <td className={td}>{i.buyerName}</td>
                  <td className={td + ' text-muted-foreground'}>{ref}</td>
                  <td className={td + ' tabular-nums'}>{eur(e.totalCost)}</td>
                  <td className={td + ' tabular-nums'}>{eur(e.revenue)}</td>
                  <td
                    className={
                      td +
                      ' tabular-nums ' +
                      (e.profit >= 0 ? 'text-emerald-600' : 'text-red-600')
                    }
                  >
                    {eur(e.profit)}
                  </td>
                  <td className={td}>
                    <Badge
                      tone={
                        i.paymentStatus === 'PAID'
                          ? 'green'
                          : i.paymentStatus === 'PARTIAL'
                            ? 'amber'
                            : 'red'
                      }
                    >
                      {i.paymentStatus}
                    </Badge>
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
