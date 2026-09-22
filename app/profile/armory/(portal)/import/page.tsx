import Link from 'next/link'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { FormField } from '@/components/armory/form-field'
import { StatusBadge } from '@/components/armory/status-badge'
import { ActionForm } from '@/components/armory/action-form'
import { requireDealerAccount } from '@/lib/armory/auth'
import { fmtDate } from '@/lib/armory/format'
import { uploadImport } from '@/lib/armory/actions/import'
import { Input } from '@/components/ui/input'
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
    <ProfilePageLayout
      title="Import"
      description="Bring in an existing Excel or CSV inventory sheet."
    >
      <SectionCard
        title="Import from a spreadsheet"
        description="You review the column mapping before anything is created."
      >
        {approved ? (
          <ActionForm action={uploadImport} submitLabel="Upload and review">
            <FormField
              label="Excel (.xlsx) or CSV file"
              hint="Accepts .xlsx or .csv, up to 15MB."
            >
              <Input name="file" type="file" accept=".xlsx,.csv" required />
            </FormField>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted-foreground">
            Import unlocks once your account is approved.
          </p>
        )}
      </SectionCard>

      {(batches?.length ?? 0) > 0 && (
        <SectionCard title="Recent imports">
          <ul className="divide-y text-sm">
            {batches!.map(b => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
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
                    <StatusBadge tone="neutral">Undone</StatusBadge>
                  ) : (
                    <StatusBadge
                      tone={b.status === 'COMPLETED' ? 'green' : 'amber'}
                    >
                      {b.status}
                    </StatusBadge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(b.created_at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </ProfilePageLayout>
  )
}
