import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireDealerAccount } from '@/lib/armory/auth'
import {
  getItem,
  listBuyers,
  listOwnershipEvents,
  listDocuments,
  listNotes,
} from '@/lib/armory/queries'
import { classify } from '@/lib/armory/classification'
import { eur } from '@/lib/armory/format'
import {
  updateItem,
  deleteItem,
  assignBuyer,
  setPayment,
  markPendingTransferManual,
  markTransferred,
  cancelPendingTransfer,
  markCommissionerNotified,
  markCollected,
} from '@/lib/armory/actions/items'
import { addNote, deleteNote } from '@/lib/armory/actions/notes'
import { ActionForm, ActionButton } from '@/components/armory/action-form'
import { ItemForm } from '@/components/armory/item-form'
import { NotesLog } from '@/components/armory/notes-log'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { StatusBadge } from '@/components/armory/status-badge'
import { FormField } from '@/components/armory/form-field'
import { BackLink } from '@/components/armory/back-link'
import { WarningList } from '@/components/armory/warning-list'
import { NativeSelect } from '@/components/armory/native-select'
import { fmtDate } from '@/lib/armory/format'
import { ITEM_STATUS_LABEL, ITEM_STATUS_TONE } from '@/lib/armory/status-tones'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const BASE = '/profile/armory'

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireDealerAccount()
  const account = ctx.dealerAccount
  const item = await getItem(account.id, id)
  if (!item) notFound()
  const approved = ctx.isApproved
  const buyers = (await listBuyers(account.id)).filter(b => !b.anonymisedAt)
  const [events, docs, notes] = await Promise.all([
    listOwnershipEvents(id),
    listDocuments(account.id, { inventoryItemId: id }),
    listNotes(account.id, 'ITEM', id),
  ])
  const engine = classify({
    ...item,
    calibreRaw: item.calibreRaw ?? item.calibreDisplay ?? undefined,
  })
  const locked = item.status === 'TRANSFERRED'
  const title =
    [item.make, item.model].filter(Boolean).join(' ') || '(unnamed item)'
  const revenue = (item.salePrice ?? 0) + (item.clientHandlingFee ?? 0)

  return (
    <ProfilePageLayout
      title={title}
      description={`${item.itemType.replace('_', ' ').toLowerCase()} · s/n ${item.serialNumber ?? '—'} · ${item.calibreDisplay ?? item.calibreRaw ?? 'no calibre'} · holder: ${item.buyerName ?? 'dealer stock'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink href={`${BASE}/shipments/${item.shipmentId}`}>
            Shipment {item.shipmentReference}
          </BackLink>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge tone={ITEM_STATUS_TONE[item.status]}>
              {ITEM_STATUS_LABEL[item.status]}
            </StatusBadge>
            {item.scheduleProforma && (
              <StatusBadge tone="blue">{item.scheduleProforma}</StatusBadge>
            )}
          </div>
        </div>
        {item.itemType === 'FIREARM' && item.currentHolderBuyerId && (
          <Button asChild size="sm">
            <a href={`${BASE}/print/proforma?items=${id}`} target="_blank">
              Print transfer proforma
            </a>
          </Button>
        )}
      </div>

      {engine.blockers.length > 0 && (
        <WarningList tone="red" items={engine.blockers} />
      )}
      {engine.warnings.length > 0 && <WarningList items={engine.warnings} />}

      {item.itemType === 'FIREARM' && (
        <SectionCard
          title="Transfer"
          description="Printing the proforma marks the firearm as pending transfer."
        >
          <div className="text-sm text-muted-foreground">
            Printed: {fmtDate(item.transferDocPrintedAt)} · Transferred:{' '}
            {fmtDate(item.transferredAt)} · Commissioner notified:{' '}
            {fmtDate(item.commissionerNotifiedAt)} · Collected:{' '}
            {fmtDate(item.collectedAt)}
          </div>
          {approved && (
            <div className="flex flex-wrap gap-2 mt-3">
              {item.status !== 'PENDING_TRANSFER' &&
                !locked &&
                item.currentHolderBuyerId && (
                  <ActionButton
                    action={markPendingTransferManual.bind(null, id)}
                  >
                    Mark pending (filled by hand)
                  </ActionButton>
                )}
              {item.status === 'PENDING_TRANSFER' && (
                <ActionButton action={cancelPendingTransfer.bind(null, id)}>
                  Cancel pending transfer
                </ActionButton>
              )}
              {!locked && item.currentHolderBuyerId && (
                <ActionForm
                  action={markTransferred.bind(null, id)}
                  submitLabel="Mark transferred"
                  inline
                  confirm="Confirm the transfer was approved by the Weapons Office?"
                >
                  <Input
                    name="transferredAt"
                    type="date"
                    className="!w-40"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </ActionForm>
              )}
              {locked && !item.commissionerNotifiedAt && (
                <ActionButton
                  variant="primary"
                  action={markCommissionerNotified.bind(null, id)}
                >
                  Commissioner notified
                </ActionButton>
              )}
              {locked && !item.collectedAt && (
                <ActionButton action={markCollected.bind(null, id)}>
                  Mark collected
                </ActionButton>
              )}
            </div>
          )}
        </SectionCard>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <SectionCard title="Buyer & payment" className="md:col-span-1">
          {approved && !locked ? (
            <>
              <ActionForm
                action={async fd => {
                  'use server'
                  const b = fd.get('buyerId')
                  return assignBuyer(id, b ? String(b) : null, fd)
                }}
                submitLabel="Update buyer"
              >
                <FormField label="Buyer">
                  <NativeSelect
                    name="buyerId"
                    defaultValue={item.currentHolderBuyerId ?? ''}
                  >
                    <option value="">Dealer stock</option>
                    {buyers.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.firstNames} {b.surname}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField label="Sale price (€)">
                  <Input
                    name="salePrice"
                    type="number"
                    step="0.01"
                    defaultValue={item.salePrice ?? ''}
                  />
                </FormField>
                <FormField label="Handling fee (€)">
                  <Input
                    name="clientHandlingFee"
                    type="number"
                    step="0.01"
                    defaultValue={item.clientHandlingFee ?? ''}
                  />
                </FormField>
              </ActionForm>
              {item.currentHolderType === 'BUYER' && (
                <ActionForm
                  action={setPayment.bind(null, id)}
                  submitLabel="Save payment"
                  className="mt-4"
                >
                  <FormField label="Amount paid (€)">
                    <Input
                      name="amountPaid"
                      type="number"
                      step="0.01"
                      defaultValue={item.amountPaid ?? 0}
                    />
                  </FormField>
                  <FormField label="Date paid">
                    <Input
                      name="datePaid"
                      type="date"
                      defaultValue={item.datePaid ?? ''}
                    />
                  </FormField>
                </ActionForm>
              )}
            </>
          ) : (
            <p className="text-sm">
              {item.buyerName ?? 'Dealer stock'} · {eur(revenue)} total ·{' '}
              {item.paymentStatus}
            </p>
          )}
        </SectionCard>

        <SectionCard title="Ownership history" className="md:col-span-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded.</p>
          ) : (
            <ol className="text-sm space-y-2">
              {events.map(e => (
                <li key={e.id}>
                  {fmtDate(e.date)} · {e.eventType}: {e.fromLabel} → {e.toLabel}
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Item details">
        {approved && !locked ? (
          <ItemForm
            action={updateItem.bind(null, id)}
            item={item}
            submitLabel="Save item"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            This record is locked after transfer.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Notes">
        <NotesLog
          notes={notes}
          addNote={addNote.bind(null, 'ITEM', id)}
          deleteNote={deleteNote.bind(null, 'ITEM', id)}
        />
      </SectionCard>

      {docs.length > 0 && (
        <SectionCard title="Generated documents">
          <ul className="text-sm space-y-1">
            {docs.map(d => (
              <li key={d.id}>
                <Link
                  href={`${BASE}/documents/${d.id}`}
                  className="hover:underline"
                >
                  {d.docType} v{d.version} · {fmtDate(d.createdAt)}
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {approved && !locked && (
        <SectionCard title="Danger zone">
          <ActionButton
            variant="danger"
            action={deleteItem.bind(null, id)}
            confirm="Move this item to the bin?"
          >
            Delete item
          </ActionButton>
        </SectionCard>
      )}
    </ProfilePageLayout>
  )
}
