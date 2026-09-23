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
import { classify, SCHEDULE_MAP } from '@/lib/armory/classification'
import { buildProforma } from '@/lib/armory/documents'
import { aiConfigured } from '@/lib/armory/ai'
import { listDownloadedImages } from '@/lib/armory/egun'
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
  overrideSchedule,
  scrapeEgun,
} from '@/lib/armory/actions/items'
import { CorrectionBox } from '@/components/armory/correction-box'
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
import { createClient } from '@/lib/supabase/server'

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
  const buyerRow = item.currentHolderBuyerId
    ? (buyers.find(b => b.id === item.currentHolderBuyerId) ?? null)
    : null
  const supabase = await createClient()
  const [events, docs, notes, images] = await Promise.all([
    listOwnershipEvents(id),
    listDocuments(account.id, { inventoryItemId: id }),
    listNotes(account.id, 'ITEM', id),
    listDownloadedImages(supabase, account.id, id),
  ])
  const proforma =
    item.itemType === 'FIREARM' ? buildProforma(account, item, buyerRow) : null
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
      titleUppercase={false}
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
            {item.euCategory && (
              <StatusBadge tone="neutral">EU {item.euCategory}</StatusBadge>
            )}
          </div>
        </div>
        {item.itemType === 'FIREARM' && (
          <div className="flex flex-wrap gap-2">
            {item.currentHolderBuyerId ? (
              <Button asChild size="sm">
                <a href={`${BASE}/print/proforma?items=${id}`} target="_blank">
                  {item.transferDocPrintedAt
                    ? 'Print transfer proforma again'
                    : 'Print transfer proforma'}
                  {proforma && proforma.missing.length > 0 && (
                    <StatusBadge tone="amber" className="ml-1">
                      {proforma.missing.length} missing
                    </StatusBadge>
                  )}
                </a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground self-center">
                Assign a buyer to print the transfer proforma
              </span>
            )}
            <Button asChild size="sm" variant="outline">
              <a
                href={`${BASE}/print/proforma?items=${id}&blank=1`}
                target="_blank"
              >
                Blank proforma
              </a>
            </Button>
          </div>
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
          {proforma && proforma.missing.length > 0 && (
            <div className="mt-3">
              <WarningList
                items={[
                  `Still missing for the proforma: ${proforma.missing.join(', ')}`,
                ]}
              />
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

        <SectionCard
          title="Correction box"
          description={
            aiConfigured()
              ? 'Describe the change in plain words; the AI maps it to the right fields and the engine re-classifies.'
              : 'Plain-language edits, e.g. “set year to 1943; calibre 9x19; serial 4471”. (Add ANTHROPIC_API_KEY to .env for free-form language.)'
          }
          className="md:col-span-2"
        >
          {approved && !locked ? (
            <CorrectionBox itemId={id} />
          ) : (
            <p className="text-sm text-muted-foreground">Locked.</p>
          )}
          <div className="mt-4 border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Schedule (both notations)
            </div>
            <div className="text-sm">
              Proforma: <strong>{item.scheduleProforma ?? '—'}</strong> · Import
              doc: <strong>{item.scheduleImportDoc ?? '—'}</strong>{' '}
              {item.scheduleOverridden ? (
                <StatusBadge tone="amber">
                  manual override: {item.scheduleOverrideReason}
                </StatusBadge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  (engine:{' '}
                  {
                    SCHEDULE_MAP[engine.scheduleCode ?? 'SCHEDULE_II']
                      .description
                  }
                  )
                </span>
              )}
            </div>
            {approved && !locked && item.itemType === 'FIREARM' && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-muted-foreground">
                  Override the schedule
                </summary>
                <ActionForm
                  action={overrideSchedule.bind(null, id)}
                  submitLabel="Apply override"
                  className="mt-2"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <FormField label="Proforma notation">
                      <Input
                        name="scheduleProforma"
                        defaultValue={item.scheduleProforma ?? ''}
                        list="schedProforma"
                      />
                    </FormField>
                    <FormField label="Import doc notation">
                      <Input
                        name="scheduleImportDoc"
                        defaultValue={item.scheduleImportDoc ?? ''}
                        list="schedImport"
                      />
                    </FormField>
                    <FormField label="Reason (audited)">
                      <Input name="reason" required />
                    </FormField>
                  </div>
                  <datalist id="schedProforma">
                    {Object.values(SCHEDULE_MAP).map(m => (
                      <option key={m.proforma} value={m.proforma} />
                    ))}
                  </datalist>
                  <datalist id="schedImport">
                    {Object.values(SCHEDULE_MAP).map(m => (
                      <option key={m.importDoc} value={m.importDoc} />
                    ))}
                  </datalist>
                </ActionForm>
                {item.scheduleOverridden && (
                  <ActionForm
                    action={overrideSchedule.bind(null, id)}
                    submitLabel="Remove override (back to engine)"
                    variant="secondary"
                    className="mt-2"
                  >
                    <input type="hidden" name="clear" value="1" />
                  </ActionForm>
                )}
              </details>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="eGun listing"
        description="Pulls price, German shipping fee, description (translated) and images before the listing disappears."
        actions={
          approved &&
          item.egunListingId &&
          !locked && (
            <ActionButton action={scrapeEgun.bind(null, id)} small>
              {item.descriptionRaw ? 'Re-fetch from eGun' : 'Fetch from eGun'}
            </ActionButton>
          )
        }
      >
        {item.egunListingUrl ? (
          <p className="text-sm">
            <a
              href={item.egunListingUrl}
              target="_blank"
              className="underline break-all"
            >
              {item.egunListingUrl}
            </a>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No eGun listing on this item.
          </p>
        )}
        {item.descriptionEn && (
          <div className="mt-3 text-sm whitespace-pre-wrap">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Description (English)
            </div>
            {item.descriptionEn}
          </div>
        )}
        {item.descriptionRaw && (
          <details className="mt-2 text-sm">
            <summary className="text-xs cursor-pointer text-muted-foreground">
              {item.descriptionEn
                ? 'Original German'
                : 'Description (original — not translated: no translation key configured)'}
            </summary>
            <div className="whitespace-pre-wrap mt-1">
              {item.descriptionRaw}
            </div>
          </details>
        )}
        {images.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {images.map(img => (
              <a
                key={img.file}
                href={img.url}
                target="_blank"
                className="block aspect-square overflow-hidden rounded border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Item details">
        {approved && !locked ? (
          <ItemForm
            action={updateItem.bind(null, id)}
            item={item}
            submitLabel="Save item"
          />
        ) : (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
            {Object.entries({
              Make: item.make,
              Model: item.model,
              Serial: item.serialNumber,
              Calibre: item.calibreDisplay,
              Country: item.countryOfManufacture,
              Year: item.yearOfManufacture,
              Capacity: item.capacity,
              Loading: item.loading,
              'Fire mode': item.fireMode,
              Sights: item.sightsType,
              CIP:
                item.cipProof === true
                  ? 'Yes'
                  : item.cipProof === false
                    ? 'No'
                    : '—',
              Seller: item.originalSeller,
              'Purchase price': eur(item.acquisitionPrice),
              'DE shipping': eur(item.egunDomesticShippingFee),
              'Sale price': eur(item.salePrice),
              'Handling fee': eur(item.clientHandlingFee),
            }).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd>{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </SectionCard>

      <SectionCard title="Ownership history & documents">
        <ol className="text-sm space-y-1">
          {events.map(e => (
            <li key={e.id}>
              <span className="text-xs text-muted-foreground">
                {fmtDate(e.date)}
              </span>{' '}
              · {e.eventType === 'IMPORT' ? 'Imported' : 'Sold'}: {e.fromLabel}{' '}
              → <strong>{e.toLabel}</strong>
            </li>
          ))}
        </ol>
        {docs.length > 0 && (
          <ul className="mt-3 border-t pt-3 text-sm space-y-1">
            {docs.map(d => (
              <li key={d.id}>
                <StatusBadge tone="purple">proforma v{d.version}</StatusBadge>{' '}
                {d.generationMethod === 'BLANK_MANUAL'
                  ? 'blank, by hand'
                  : 'auto-filled'}{' '}
                · {fmtDate(d.createdAt)} ·{' '}
                <Link href={`${BASE}/documents/${d.id}`} className="underline">
                  snapshot
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Notes">
        <NotesLog
          notes={notes}
          addNote={addNote.bind(null, 'ITEM', id)}
          deleteNote={deleteNote.bind(null, 'ITEM', id)}
        />
      </SectionCard>

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
