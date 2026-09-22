import Link from 'next/link'
import { requireDealerAccount } from '@/lib/armory/auth'
import { listDocumentsEnriched } from '@/lib/armory/queries'
import {
  Card,
  Table,
  th,
  td,
  Empty,
  Badge,
  fmtDate,
} from '@/components/armory/ui'

const BASE = '/profile/armory'

export default async function DocumentsPage() {
  const ctx = await requireDealerAccount()
  const docs = await listDocumentsEnriched(ctx.dealerAccount.id)

  return (
    <Card
      title={`Documents generated (${docs.length})`}
      description="Audit trail of every Prior Consent and transfer proforma printed."
    >
      {docs.length === 0 ? (
        <Empty>Nothing printed yet.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={th}>Document</th>
              <th className={th}>Subject</th>
              <th className={th}>Method</th>
              <th className={th}>By</th>
              <th className={th}>When</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id}>
                <td className={td}>
                  <Link
                    href={`${BASE}/documents/${d.id}`}
                    className="hover:underline"
                  >
                    <Badge
                      tone={d.docType === 'PRIOR_CONSENT' ? 'blue' : 'purple'}
                    >
                      {d.docType === 'PRIOR_CONSENT'
                        ? 'Prior consent'
                        : 'Transfer proforma'}
                    </Badge>{' '}
                    v{d.version}
                  </Link>
                </td>
                <td className={td}>
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
                </td>
                <td className={td + ' text-xs'}>
                  {d.generationMethod === 'BLANK_MANUAL'
                    ? 'blank, by hand'
                    : 'auto-filled'}
                </td>
                <td className={td + ' text-xs text-muted-foreground'}>
                  {d.createdByEmail ?? '—'}
                </td>
                <td className={td + ' text-xs text-muted-foreground'}>
                  {fmtDate(d.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}
