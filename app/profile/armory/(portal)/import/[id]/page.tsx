import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { BackLink } from '@/components/armory/back-link'
import { SectionCard } from '@/components/armory/section-card'
import { FormField } from '@/components/armory/form-field'
import { NativeSelect } from '@/components/armory/native-select'
import { ActionForm, ActionButton } from '@/components/armory/action-form'
import { ImportRowsTable } from '@/components/armory/import-rows-table'
import { requireDealerAccount } from '@/lib/armory/auth'
import { listShipments } from '@/lib/armory/queries'
import { IMPORT_TARGETS, guessItemType } from '@/lib/armory/import'
import { confirmImport, suggestRowTypes } from '@/lib/armory/actions/import'
import { aiConfigured, type RowTypeGuess } from '@/lib/armory/ai'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/server'

const BASE = '/profile/armory'
const TYPE_GUESSES_KEY = '__typeGuesses'

function columnMapping(raw: Record<string, unknown>) {
  const out: Record<number, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k === TYPE_GUESSES_KEY) continue
    out[Number(k)] = String(v)
  }
  return out
}

function typeGuesses(raw: Record<string, unknown>) {
  const g = raw[TYPE_GUESSES_KEY]
  if (!g || typeof g !== 'object') return {} as Record<number, RowTypeGuess>
  return g as Record<number, RowTypeGuess>
}

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
  const storedMapping = (batch.mapping ?? {}) as Record<string, unknown>
  const mapping = columnMapping(storedMapping)
  const guesses = typeGuesses(storedMapping)
  const rowTypes = rows.map((r, idx) => {
    const rec: Record<string, string> = {}
    for (const [col, target] of Object.entries(mapping))
      rec[target] = r[Number(col)] ?? ''
    const guess = guesses[idx]
    return {
      itemType: guess?.itemType ?? guessItemType(rec),
      confidence: guess?.confidence ?? null,
    }
  })

  const { data: siblings } = await supabase
    .from('armory_import_batches')
    .select('id, sheet_name, status, created_at')
    .eq('dealer_account_id', ctx.dealerAccount.id)
    .eq('file_name', batch.file_name)
    .order('created_at')

  if (batch.status !== 'PENDING') {
    return (
      <ProfilePageLayout title="Import already processed">
        <BackLink href={`${BASE}/inventory`}>Back to inventory</BackLink>
      </ProfilePageLayout>
    )
  }

  const shipments = await listShipments(ctx.dealerAccount.id)

  return (
    <ProfilePageLayout
      title={`Review: ${batch.file_name}${batch.sheet_name ? ` — ${batch.sheet_name}` : ''}`}
      titleUppercase={false}
      description={`${rows.length} rows. Set what each column means, pick the shipment, untick any rows you don't want.`}
    >
      <BackLink href={`${BASE}/inventory`}>Inventory</BackLink>
      {(siblings?.length ?? 0) > 1 && (
        <p className="text-xs text-muted-foreground">
          Other tabs in this file:{' '}
          {siblings!
            .filter(s => s.id !== id)
            .map(s => (
              <Link
                key={s.id}
                href={`${BASE}/import/${s.id}`}
                className="underline mr-2"
              >
                {s.sheet_name ?? s.id.slice(0, 6)}
                {s.status === 'COMPLETED' ? ' (done)' : ''}
              </Link>
            ))}
        </p>
      )}

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

        <SectionCard
          title="Column mapping"
          description="Buyer initials (e.g. DZ, MS, CW) are matched against your buyers list; unmatched ones are kept in the item notes."
        >
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

        <SectionCard
          title="Rows"
          description="Rows with no data in any mapped column are faded — they're skipped automatically even if left ticked. Check the Type column — a row guessed wrong here is the usual cause of an accessory or component ending up filed as a firearm."
        >
          {aiConfigured() && (
            <div className="mb-3">
              <ActionButton action={suggestRowTypes.bind(null, id)}>
                {Object.keys(guesses).length
                  ? 'Re-suggest types with AI'
                  : 'Suggest types with AI'}
              </ActionButton>
            </div>
          )}
          <ImportRowsTable headers={headers} rows={rows} rowTypes={rowTypes} />
        </SectionCard>
      </ActionForm>
    </ProfilePageLayout>
  )
}
