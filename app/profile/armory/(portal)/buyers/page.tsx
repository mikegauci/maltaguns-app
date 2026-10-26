import Link from 'next/link'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { StatusBadge } from '@/components/armory/status-badge'
import { BuyerForm } from '@/components/armory/buyer-form'
import { requireDealerAccount } from '@/lib/armory/auth'
import { listBuyers } from '@/lib/armory/queries'
import { createBuyer } from '@/lib/armory/actions/buyers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const BASE = '/profile/armory'

export default async function BuyersPage() {
  const ctx = await requireDealerAccount()
  const buyers = await listBuyers(ctx.dealerAccount.id)
  const approved = ctx.isApproved

  return (
    <ProfilePageLayout
      title="Buyers"
      description="The people your imported items are transferred to."
    >
      <SectionCard title={`Buyers (${buyers.length})`}>
        {buyers.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No buyers yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Licence</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Notify</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buyers.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
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
                        <StatusBadge tone="neutral" className="ml-2">
                          anonymised
                        </StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.licenceType
                        ? b.licenceType.split(',').join(', ')
                        : '—'}
                      {b.licenceNumber ? ` · ${b.licenceNumber}` : ''}
                    </TableCell>
                    <TableCell>{b.phoneNumber ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {[
                        b.whatsappOptIn ? 'WhatsApp' : null,
                        b.smsOptIn ? 'SMS' : null,
                      ]
                        .filter(Boolean)
                        .join(', ') || (
                        <span className="text-muted-foreground">none</span>
                      )}
                    </TableCell>
                    <TableCell>{b.itemCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {approved && (
        <SectionCard title="Add buyer">
          <BuyerForm action={createBuyer} submitLabel="Add buyer" />
        </SectionCard>
      )}
    </ProfilePageLayout>
  )
}
