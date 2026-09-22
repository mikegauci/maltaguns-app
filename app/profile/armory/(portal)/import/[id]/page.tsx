import { notFound } from 'next/navigation'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { BackLink } from '@/components/armory/back-link'
import { SectionCard } from '@/components/armory/section-card'
import { FormField } from '@/components/armory/form-field'
import { NativeSelect } from '@/components/armory/native-select'
import { ActionForm } from '@/components/armory/action-form'
import { requireDealerAccount } from '@/lib/armory/auth'
import { listShipments } from '@/lib/armory/queries'
import { IMPORT_TARGETS, guessItemType } from '@/lib/armory/import'
import { confirmImport } from '@/lib/armory/actions/import'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/server'

const BASE = '/profile/armory'

export default async function ImportReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireDealerAccount()
  const supabase = await createClient()
  const { data: batch } = await supabase
    .from('armory_import_batches')
    .select('*')
    .eq('id', id)
    .eq('dealer_account_id', ctx.dealerAccount.id)
    .maybeSingle()

  if (!batch) notFound()

  const headers = batch.headers as string[]
  const rows = batch.rows as string[][]
  const mapping = (batch.mapping ?? {}) as Record<number, string>

  if (batch.status !== 'PENDING') {
    return (
      <ProfilePageLayout title="Import already processed">
        <BackLink href={`${BASE}/import`}>Back to imports</BackLink>
      </ProfilePageLayout>
    )
  }

  const shipments = await listShipments(ctx.dealerAccount.id)

  return (
    <ProfilePageLayout
      title={`Review: ${batch.file_name}${batch.sheet_name ? ` — ${batch.sheet_name}` : ''}`}
      description={`${rows.length} rows`}
    >
      <BackLink href={`${BASE}/import`}>Imports</BackLink>

      <ActionForm
        action={confirmImport.bind(null, id)}
        submitLabel="Import to inventory"
        submitAtTop
      >
        <SectionCard title="Target shipment">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Existing shipment">
              <NativeSelect name="shipmentId" defaultValue="">
                <option value="">— choose —</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.reference} ({s.itemCount} items)
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="…or create a new shipment with reference">
              <Input
                name="newShipmentReference"
                placeholder={batch.sheet_name ?? 'e.g. Shipment 62'}
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Column mapping">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {headers.map((h, i) => (
              <FormField key={i} label={h}>
                <NativeSelect name={`map_${i}`} defaultValue={mapping[i] ?? ''}>
                  <option value="">(ignore)</option>
                  {IMPORT_TARGETS.map(t => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Preview (first 10 rows)">
          <div className="overflow-x-auto text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="border p-1 text-left">
                      {h}
                    </th>
                  ))}
                  <th className="border p-1">Guessed type</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, ri) => {
                  const rec: Record<string, string> = {}
                  for (const [col, target] of Object.entries(mapping))
                    rec[target] = row[Number(col)] ?? ''
                  return (
                    <tr key={ri}>
                      {headers.map((_, ci) => (
                        <td key={ci} className="border p-1">
                          {row[ci] ?? ''}
                        </td>
                      ))}
                      <td className="border p-1">{guessItemType(rec)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </ActionForm>
    </ProfilePageLayout>
  )
}
