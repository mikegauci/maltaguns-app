import Link from 'next/link'
import { requireDealerAccount } from '@/lib/armory/auth'
import { listBuyers } from '@/lib/armory/queries'
import { createBuyer } from '@/lib/armory/actions/buyers'
import { BuyerForm } from '@/components/armory/buyer-form'
import { Card, Table, th, td, Empty, Badge } from '@/components/armory/ui'

const BASE = '/profile/armory'

export default async function BuyersPage() {
  const ctx = await requireDealerAccount()
  const buyers = await listBuyers(ctx.dealerAccount.id)
  const approved = ctx.isApproved

  return (
    <>
      <Card
        title={`Buyers (${buyers.length})`}
        description="The people your imported items are transferred to."
      >
        {buyers.length === 0 ? (
          <Empty>No buyers yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Licence</th>
                <th className={th}>Phone</th>
                <th className={th}>Notify</th>
                <th className={th}>Items</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map(b => (
                <tr key={b.id} className="hover:bg-muted/50">
                  <td className={td}>
                    <Link
                      href={`${BASE}/buyers/${b.id}`}
                      className="font-medium hover:underline"
                    >
                      {b.firstNames} {b.surname}
                    </Link>
                    {b.nickname && (
                      <span className="text-muted-foreground">
                        {' '}
                        &ldquo;{b.nickname}&rdquo;
                      </span>
                    )}
                    {b.anonymisedAt && (
                      <Badge tone="neutral" className="ml-2">
                        anonymised
                      </Badge>
                    )}
                  </td>
                  <td className={td + ' text-muted-foreground'}>
                    {b.licenceType ? b.licenceType.split(',').join(', ') : '—'}
                    {b.licenceNumber ? ` · ${b.licenceNumber}` : ''}
                  </td>
                  <td className={td}>{b.phoneNumber ?? '—'}</td>
                  <td className={td + ' text-xs'}>
                    {[
                      b.whatsappOptIn ? 'WhatsApp' : null,
                      b.smsOptIn ? 'SMS' : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || (
                      <span className="text-muted-foreground">none</span>
                    )}
                  </td>
                  <td className={td}>{b.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {approved && (
        <Card title="Add buyer">
          <BuyerForm action={createBuyer} submitLabel="Add buyer" />
        </Card>
      )}
    </>
  )
}
