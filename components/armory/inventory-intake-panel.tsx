import Link from 'next/link'
import type { ReactNode } from 'react'
import { FileSpreadsheet, History, Plus } from 'lucide-react'
import { SectionCard } from '@/components/armory/section-card'
import { ActionForm, ActionButton } from '@/components/armory/action-form'
import { ImportFilePicker } from '@/components/armory/import-file-picker'
import { ManualAddSection } from '@/components/armory/manual-add-section'
import { StatusBadge } from '@/components/armory/status-badge'
import { AppAlert } from '@/components/design-system'
import { uploadImport, undoImport } from '@/lib/armory/actions/import'
import { fmtDate } from '@/lib/armory/format'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const BASE = '/profile/armory'

type ImportBatch = {
  id: string
  file_name: string
  sheet_name: string | null
  status: string
  created_at: string
  undone_at: string | null
}

function importStatusLabel(batch: ImportBatch) {
  if (batch.undone_at) return 'Undone'
  if (batch.status === 'COMPLETED') return 'Done'
  if (batch.status === 'PENDING') return 'Review pending'
  return batch.status
}

function importStatusTone(batch: ImportBatch) {
  if (batch.undone_at) return 'neutral' as const
  if (batch.status === 'COMPLETED') return 'green' as const
  return 'amber' as const
}

export function InventoryIntakePanel({
  approved,
  batches,
  manualAdd,
}: {
  approved: boolean
  batches: ImportBatch[]
  manualAdd?: ReactNode
}) {
  const pendingCount = batches.filter(
    b => b.status === 'PENDING' && !b.undone_at
  ).length

  return (
    <SectionCard
      title="Stock intake"
      description="Bring inventory in from a dealer spreadsheet or add a one-off purchase manually."
    >
      {!approved && (
        <AppAlert variant="pending" title="Approval required" className="mb-6">
          Import and manual add unlock once your dealership is approved.
        </AppAlert>
      )}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-0">
        <div className="space-y-4 lg:border-r lg:border-border lg:pr-8">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Import from spreadsheet
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                One tab per shipment works best. You map columns before anything
                is created.
              </p>
            </div>
          </div>

          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            <li className="rounded-sm bg-muted/40 px-2 py-0.5 text-foreground">
              1 · Upload
            </li>
            <li aria-hidden className="text-border">
              →
            </li>
            <li className="rounded-sm bg-muted/30 px-2 py-0.5">
              2 · Map columns
            </li>
            <li aria-hidden className="text-border">
              →
            </li>
            <li className="rounded-sm bg-muted/30 px-2 py-0.5">3 · Confirm</li>
          </ol>

          {approved ? (
            <ActionForm action={uploadImport} submitLabel="Upload and review">
              <ImportFilePicker name="file" accept=".xlsx,.xls,.csv" required />
            </ActionForm>
          ) : (
            <ImportFilePicker name="file" accept=".xlsx,.xls,.csv" disabled />
          )}

          <p className="text-xs text-muted-foreground">
            Google Sheets: File → Download → Excel (.xlsx) or CSV. Multi-tab
            files become separate imports you review one at a time.
          </p>
        </div>

        <div className="lg:pl-8">
          {approved && manualAdd ? (
            <ManualAddSection>{manualAdd}</ManualAddSection>
          ) : (
            <div className="flex h-full min-h-[12rem] flex-col justify-center rounded-sm border border-dashed border-border bg-muted/10 px-4 py-6 text-center">
              <PlusPlaceholder />
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                Manual add
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Available after dealership approval
              </p>
            </div>
          )}
        </div>
      </div>

      {batches.length > 0 && (
        <>
          <div className="my-6 border-t border-border" />
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h3 className="text-sm font-semibold text-foreground">
                Recent imports
              </h3>
              {pendingCount > 0 && (
                <StatusBadge tone="amber">
                  {pendingCount} awaiting review
                </StatusBadge>
              )}
            </div>
            <p className="text-xs text-muted-foreground max-w-md text-right">
              Undo sends non-transferred items to the Bin for 30 days.
              Transferred records are never touched.
            </p>
          </div>

          <div className="overflow-x-auto rounded-sm border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">File</TableHead>
                  <TableHead className="text-xs w-28">Tab</TableHead>
                  <TableHead className="text-xs w-32">Status</TableHead>
                  <TableHead className="text-xs w-28">Date</TableHead>
                  <TableHead className="text-xs w-36 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map(b => {
                  const pending = b.status === 'PENDING' && !b.undone_at
                  return (
                    <TableRow
                      key={b.id}
                      className={cn(
                        pending &&
                          'bg-amber-500/5 border-l-2 border-l-amber-500'
                      )}
                    >
                      <TableCell className="text-sm font-medium max-w-[14rem] truncate">
                        {pending ? (
                          <Link
                            href={`${BASE}/import/${b.id}`}
                            className="text-primary hover:underline"
                          >
                            {b.file_name}
                          </Link>
                        ) : (
                          b.file_name
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[7rem]">
                        {b.sheet_name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={importStatusTone(b)}>
                          {importStatusLabel(b)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(b.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {pending ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`${BASE}/import/${b.id}`}>
                              Continue review
                            </Link>
                          </Button>
                        ) : b.status === 'COMPLETED' && !b.undone_at ? (
                          <ActionButton
                            small
                            variant="danger"
                            action={undoImport.bind(null, b.id)}
                            confirm="Undo this import? Every non-transferred item it created will move to the Bin (restorable for 30 days), including reserved and pending-transfer items. Already-transferred items are left alone."
                          >
                            Undo
                          </ActionButton>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </SectionCard>
  )
}

function PlusPlaceholder() {
  return (
    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm bg-muted/40 text-muted-foreground">
      <Plus className="h-5 w-5" aria-hidden />
    </span>
  )
}
