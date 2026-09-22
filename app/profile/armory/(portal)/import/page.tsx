import Link from 'next/link'
import { requireDealerAccount } from '@/lib/armory/auth'
import { uploadImport } from '@/lib/armory/actions/import'
import { ActionForm } from '@/components/armory/action-form'
import { Card, Field, Input, fmtDate, Badge } from '@/components/armory/ui'
import { createClient } from '@/lib/supabase/server'

const BASE = '/profile/armory'

export default async function ImportPage() {
  const ctx = await requireDealerAccount()
  const approved = ctx.isApproved
  const supabase = await createClient()
  const { data: batches } = await supabase
    .from('armory_import_batches')
    .select('id, file_name, sheet_name, status, created_at, undone_at')
    .eq('dealer_account_id', ctx.dealerAccount.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <>
      <Card
        title="Import from a spreadsheet"
        description="Bring in an existing Excel or CSV inventory sheet. You review the column mapping before anything is created."
      >
        {approved ? (
          <ActionForm action={uploadImport} submitLabel="Upload and review">
            <Field
              label="Excel (.xlsx) or CSV file"
              hint="Accepts .xlsx or .csv, up to 15MB."
            >
              <Input name="file" type="file" accept=".xlsx,.csv" required />
            </Field>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted-foreground">
            Import unlocks once your account is approved.
          </p>
        )}
      </Card>
      {(batches?.length ?? 0) > 0 && (
        <Card title="Recent imports">
          <ul className="text-sm divide-y">
            {batches!.map(b => (
              <li
                key={b.id}
                className="py-2 flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {b.status === 'PENDING' ? (
                    <Link href={`${BASE}/import/${b.id}`} className="underline">
                      {b.file_name}
                    </Link>
                  ) : (
                    b.file_name
                  )}
                  {b.sheet_name && (
                    <span className="text-muted-foreground">
                      {' '}
                      · {b.sheet_name}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  {b.undone_at ? (
                    <Badge tone="neutral">Undone</Badge>
                  ) : (
                    <Badge tone={b.status === 'COMPLETED' ? 'green' : 'amber'}>
                      {b.status}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(b.created_at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
