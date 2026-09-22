import { notFound } from 'next/navigation'
import { requireDealerAccount } from '@/lib/armory/auth'
import { listShipments } from '@/lib/armory/queries'
import { IMPORT_TARGETS, guessItemType } from '@/lib/armory/import'
import { confirmImport } from '@/lib/armory/actions/import'
import { ActionForm } from '@/components/armory/action-form'
import { Card, Field, Input, Select, BackLink } from '@/components/armory/ui'
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
      <Card title="Import already processed">
        <BackLink href={`${BASE}/import`}>Back to imports</BackLink>
      </Card>
    )
  }

  const shipments = await listShipments(ctx.dealerAccount.id)

  return (
    <>
      <div>
        <BackLink href={`${BASE}/import`}>Imports</BackLink>
        <h1 className="text-xl font-semibold mt-1">
          Review: {batch.file_name}
          {batch.sheet_name ? ` — ${batch.sheet_name}` : ''}
        </h1>
        <p className="text-xs text-muted-foreground">{rows.length} rows</p>
      </div>
      <ActionForm
        action={confirmImport.bind(null, id)}
        submitLabel="Import to inventory"
        submitAtTop
      >
        <Card title="Target shipment">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Existing shipment">
              <Select name="shipmentId" defaultValue="">
                <option value="">— choose —</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.reference} ({s.itemCount} items)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="…or create a new shipment with reference">
              <Input
                name="newShipmentReference"
                placeholder={batch.sheet_name ?? 'e.g. Shipment 62'}
              />
            </Field>
          </div>
        </Card>
        <Card title="Column mapping">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {headers.map((h, i) => (
              <Field key={i} label={h}>
                <Select name={`map_${i}`} defaultValue={mapping[i] ?? ''}>
                  <option value="">(ignore)</option>
                  {IMPORT_TARGETS.map(t => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
        </Card>
        <Card title="Preview (first 10 rows)">
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
        </Card>
      </ActionForm>
    </>
  )
}
