import { notFound } from 'next/navigation'
import { requireDealerAccount } from '@/lib/armory/auth'
import { createClient } from '@/lib/supabase/server'
import { mapDocument, type DocumentRowDb } from '@/lib/armory/types'
import { Card, BackLink, Badge, fmtDate, Warn } from '@/components/armory/ui'

const BASE = '/profile/armory'

export default async function DocumentSnapshotPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireDealerAccount()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_generated_documents')
    .select('*')
    .eq('id', id)
    .eq('dealer_account_id', ctx.dealerAccount.id)
    .maybeSingle()

  if (error || !data) notFound()
  const d = mapDocument(data as DocumentRowDb)
  const missing = d.missingFieldsAtPrint
    ? (JSON.parse(d.missingFieldsAtPrint) as string[])
    : []
  const snap = JSON.parse(d.dataSnapshot)

  return (
    <>
      <div>
        <BackLink href={`${BASE}/documents`}>All documents</BackLink>
        <h1 className="text-xl font-semibold mt-1 flex items-center gap-2">
          <Badge tone={d.docType === 'PRIOR_CONSENT' ? 'blue' : 'purple'}>
            {d.docType === 'PRIOR_CONSENT'
              ? 'Prior consent'
              : 'Transfer proforma'}
          </Badge>{' '}
          version {d.version} · {fmtDate(d.createdAt)}
        </h1>
        <p className="text-xs text-muted-foreground">
          {d.generationMethod === 'BLANK_MANUAL'
            ? 'Blank form printed and completed by hand.'
            : 'Exact data that was on the printed page.'}
        </p>
      </div>
      {missing.length > 0 && (
        <Warn items={missing.map(m => `Missing at print: ${m}`)} />
      )}
      <Card title="Snapshot">
        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(snap, null, 2)}
        </pre>
      </Card>
    </>
  )
}
