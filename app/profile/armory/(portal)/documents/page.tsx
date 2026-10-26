import Link from 'next/link'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { StatusBadge } from '@/components/armory/status-badge'
import { requireDealerAccount } from '@/lib/armory/auth'
import { fmtDate } from '@/lib/armory/format'
import { listDocumentsEnriched } from '@/lib/armory/queries'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const BASE = '/profile/armory'

export default async function DocumentsPage() {
  const ctx = await requireDealerAccount()
  const docs = await listDocumentsEnriched(ctx.dealerAccount.id)

  return (
    <ProfilePageLayout
      title="Documents"
      description="Audit trail of every Prior Consent and transfer proforma printed."
    >
      <SectionCard title={`Documents generated (${docs.length})`}>
        {docs.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing printed yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`${BASE}/documents/${d.id}`}
                        className="hover:underline"
                      >
                        <StatusBadge
                          tone={
                            d.docType === 'PRIOR_CONSENT' ? 'blue' : 'purple'
                          }
                        >
                          {d.docType === 'PRIOR_CONSENT'
                            ? 'Prior consent'
                            : 'Transfer proforma'}
                        </StatusBadge>{' '}
                        v{d.version}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {d.docType === 'PRIOR_CONSENT' ? (
                        <Link
                          href={`${BASE}/shipments/${d.shipmentId}`}
                          className="hover:underline"
                        >
                          {d.shipmentReference}
                        </Link>
                      ) : (
                        <Link
                          href={`${BASE}/inventory/${d.inventoryItemId}`}
                          className="hover:underline"
                        >
                          {[d.make, d.model].filter(Boolean).join(' ')}{' '}
                          <span className="text-muted-foreground">
                            s/n {d.serialNumber ?? '—'}
                          </span>
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.generationMethod === 'BLANK_MANUAL'
                        ? 'blank, by hand'
                        : 'auto-filled'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.createdByEmail ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(d.createdAt)}
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
