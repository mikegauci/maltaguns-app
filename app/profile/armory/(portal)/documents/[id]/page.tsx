import { notFound } from 'next/navigation'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { BackLink } from '@/components/armory/back-link'
import { SectionCard } from '@/components/armory/section-card'
import { StatusBadge } from '@/components/armory/status-badge'
import { WarningList } from '@/components/armory/warning-list'
import { requireDealerAccount } from '@/lib/armory/auth'
import { fmtDate } from '@/lib/armory/format'
import { createClient } from '@/lib/supabase/server'
import { mapDocument, type DocumentRowDb } from '@/lib/armory/types'

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
    <ProfilePageLayout
      title={`Document version ${d.version}`}
      description={`${d.generationMethod === 'BLANK_MANUAL' ? 'Blank form printed and completed by hand.' : 'Exact data that was on the printed page.'} · ${fmtDate(d.createdAt)}`}
    >
      <BackLink href={`${BASE}/documents`}>All documents</BackLink>
      <div className="flex items-center gap-2">
        <StatusBadge tone={d.docType === 'PRIOR_CONSENT' ? 'blue' : 'purple'}>
          {d.docType === 'PRIOR_CONSENT'
            ? 'Prior consent'
            : 'Transfer proforma'}
        </StatusBadge>
      </div>

      {missing.length > 0 && (
        <WarningList items={missing.map(m => `Missing at print: ${m}`)} />
      )}

      <SectionCard title="Snapshot">
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
          {JSON.stringify(snap, null, 2)}
        </pre>
      </SectionCard>
    </ProfilePageLayout>
  )
}
