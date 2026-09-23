import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireDealerAccount } from '@/lib/armory/auth'
import {
  getShipment,
  listItemsForShipment,
  listBuyers,
  listQuotes,
  listCosts,
  listDocuments,
  listNotes,
  listNotificationsForShipment,
  SHIPMENT_STATUSES,
} from '@/lib/armory/queries'
import {
  TRIGGER_LABEL,
  notificationsConfigured,
  type Trigger,
} from '@/lib/armory/notifications'
import {
  summariseShipment,
  eur,
  ALLOCATION_METHODS,
} from '@/lib/armory/accounting'
import { buildPriorConsent } from '@/lib/armory/documents'
import { PriorConsentPrintMenu } from '@/components/armory/prior-consent-print-menu'
import {
  updateShipment,
  setShipmentStatus,
  addQuote,
  setQuoteStatus,
  deleteQuote,
  addCost,
  deleteCost,
  deleteShipment,
} from '@/lib/armory/actions/shipments'
import { createItem } from '@/lib/armory/actions/items'
import { addNote, deleteNote } from '@/lib/armory/actions/notes'
import { ActionForm, ActionButton } from '@/components/armory/action-form'
import { ItemForm } from '@/components/armory/item-form'
import { ItemsTable } from '@/components/armory/items-table'
import { NotesLog } from '@/components/armory/notes-log'
import { StatusControls } from './status-controls'
import { AppAlert } from '@/components/design-system'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { StatCard } from '@/components/armory/stat-card'
import { StatusBadge } from '@/components/armory/status-badge'
import { FormField } from '@/components/armory/form-field'
import { BackLink } from '@/components/armory/back-link'
import { WarningList } from '@/components/armory/warning-list'
import { NativeSelect } from '@/components/armory/native-select'
import { fmtDate } from '@/lib/armory/format'
import { SHIPMENT_STATUS_TONE } from '@/lib/armory/status-tones'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const BASE = '/profile/armory'

export default async function ShipmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ imported?: string; skipped?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const ctx = await requireDealerAccount()
  const account = ctx.dealerAccount
  const shipment = await getShipment(account.id, id)
  if (!shipment) notFound()
  const approved = ctx.isApproved

  const [items, buyers, quotes, costs, docs, notes, notifications] =
    await Promise.all([
      listItemsForShipment(account.id, id),
      listBuyers(account.id),
      listQuotes(id),
      listCosts(id),
      listDocuments(account.id, { shipmentId: id }),
      listNotes(account.id, 'SHIPMENT', id),
      listNotificationsForShipment(account.id, id),
    ])
  const activeBuyers = buyers.filter(b => !b.anonymisedAt)
  const summary = summariseShipment(
    shipment,
    items,
    costs,
    account.shippingAllocationMethod
  )
  const pc = buildPriorConsent(account, shipment, items)
  const statusLabel =
    SHIPMENT_STATUSES.find(s => s.value === shipment.status)?.label ??
    shipment.status

  return (
    <ProfilePageLayout
      title={shipment.reference}
      titleUppercase={false}
      description={`Created ${fmtDate(shipment.createdAt)} · ${items.length} items (${items.filter(i => i.itemType === 'FIREARM').length} firearms)${shipment.priorConsentRef ? ` · Prior consent ${shipment.priorConsentRef}` : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink href={BASE}>All shipments</BackLink>
          <StatusBadge tone={SHIPMENT_STATUS_TONE[shipment.status]}>
            {statusLabel}
          </StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`${BASE}/shipments/${id}/export`}>Export XLS</a>
          </Button>
          <PriorConsentPrintMenu
            shipmentId={id}
            missingCount={pc.missing.length}
          />
        </div>
      </div>

      {sp.imported && (
        <AppAlert variant="success">
          Imported {sp.imported} item(s)
          {sp.skipped && sp.skipped !== '0'
            ? `, ${sp.skipped} row(s) skipped`
            : ''}
          .
        </AppAlert>
      )}

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Acquisition (items + DE shipping)"
          value={eur(summary.acquisition)}
        />
        <StatCard
          label="Shipment costs"
          value={eur(summary.shippingCosts)}
          sub={
            ALLOCATION_METHODS.find(
              m => m.value === account.shippingAllocationMethod
            )?.label
          }
        />
        <StatCard label="Revenue (sales + fees)" value={eur(summary.revenue)} />
        <StatCard
          label="Profit so far"
          value={eur(summary.profit)}
          tone={summary.profit >= 0 ? 'good' : 'bad'}
          sub={`${eur(summary.unsoldCost)} still in stock`}
        />
        <StatCard
          label="Outstanding from buyers"
          value={eur(summary.outstanding)}
          tone={summary.outstanding > 0 ? 'bad' : undefined}
        />
      </section>

      <SectionCard
        title="Status"
        description="Moving to Prior consent submitted, Shipped or Ready for collection can notify buyers who opted in."
      >
        <StatusControls
          shipmentId={id}
          current={shipment.status}
          statuses={SHIPMENT_STATUSES}
          providerConfigured={notificationsConfigured()}
          setStatus={setShipmentStatus}
        />
        <dl className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
          <div>
            Prior consent applied:{' '}
            <span className="text-foreground">
              {fmtDate(shipment.permitAppliedAt)}
            </span>
          </div>
          <div>
            Shipped:{' '}
            <span className="text-foreground">
              {fmtDate(shipment.shippedAt)}
            </span>
          </div>
          <div>
            Arrived:{' '}
            <span className="text-foreground">
              {fmtDate(shipment.arrivedAt)}
            </span>
          </div>
          <div>
            Ready:{' '}
            <span className="text-foreground">{fmtDate(shipment.readyAt)}</span>
          </div>
        </dl>
        {shipment.status === 'PERMIT_REJECTED' && (
          <WarningList
            tone="red"
            items={[
              `Prior consent rejected${shipment.permitRejectedReason ? `: ${shipment.permitRejectedReason}` : ''}. Fix the missing information and re-submit.`,
            ]}
          />
        )}
      </SectionCard>

      <SectionCard
        title={`Items (${items.length})`}
        description="Firearms and essential components go on the Prior Consent annex."
      >
        <ItemsTable items={items} showEconomics buyers={activeBuyers} />
        {approved && (
          <details className="mt-4 group">
            <summary className="cursor-pointer text-sm font-medium select-none">
              + Add item
            </summary>
            <div className="mt-3 rounded border border-dashed p-4">
              <ItemForm
                action={createItem.bind(null, id)}
                submitLabel="Add to shipment"
                compact
              />
            </div>
          </details>
        )}
      </SectionCard>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard
          title="Origin dealer (sender)"
          description="Section 3 of the Prior Consent."
        >
          <ActionForm
            action={updateShipment.bind(null, id)}
            submitLabel="Save sender"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Reference">
                <Input
                  name="reference"
                  defaultValue={shipment.reference}
                  required
                />
              </FormField>
              <FormField label="Sender is a">
                <NativeSelect
                  name="senderType"
                  defaultValue={shipment.senderType ?? 'COMPANY'}
                >
                  <option value="COMPANY">Company / dealer</option>
                  <option value="PERSON">Natural person</option>
                </NativeSelect>
              </FormField>
              <FormField label="Company name">
                <Input
                  name="senderCompanyName"
                  defaultValue={shipment.senderCompanyName ?? ''}
                />
              </FormField>
              <FormField label="Country">
                <Input
                  name="senderCountry"
                  defaultValue={shipment.senderCountry ?? ''}
                />
              </FormField>
              <FormField label="Address" className="col-span-2">
                <Textarea
                  name="senderAddress"
                  defaultValue={shipment.senderAddress ?? ''}
                  rows={2}
                />
              </FormField>
              <FormField label="Telephone">
                <Input
                  name="senderPhone"
                  defaultValue={shipment.senderPhone ?? ''}
                />
              </FormField>
              <FormField label="Fax">
                <Input
                  name="senderFax"
                  defaultValue={shipment.senderFax ?? ''}
                />
              </FormField>
            </div>
          </ActionForm>
        </SectionCard>

        <SectionCard
          title="Permits, export & transport"
          description="Filled in as the paperwork comes back: the Police reference on the accepted Prior Consent, then the origin country's export notification, carrier and delivery point."
        >
          <ActionForm action={updateShipment.bind(null, id)} submitLabel="Save">
            <div className="grid md:grid-cols-4 gap-3">
              <FormField label="Prior consent ref. (Police)">
                <Input
                  name="priorConsentRef"
                  defaultValue={shipment.priorConsentRef ?? ''}
                />
              </FormField>
              <FormField label="Prior consent date">
                <Input
                  name="priorConsentDate"
                  type="date"
                  defaultValue={shipment.priorConsentDate ?? ''}
                />
              </FormField>
              <FormField label="Export authorisation ref.">
                <Input
                  name="exportAuthorisationRef"
                  defaultValue={shipment.exportAuthorisationRef ?? ''}
                  placeholder="e.g. 01-2026-2636"
                />
              </FormField>
              <FormField label="Export authorisation date">
                <Input
                  name="exportAuthorisationDate"
                  type="date"
                  defaultValue={shipment.exportAuthorisationDate ?? ''}
                />
              </FormField>
              <FormField label="Carrier">
                <Input
                  name="carrier"
                  defaultValue={shipment.carrier ?? ''}
                  placeholder="e.g. Lufthansa Cargo (air freight)"
                />
              </FormField>
              <FormField label="Transit countries">
                <Input
                  name="transitCountries"
                  defaultValue={shipment.transitCountries ?? ''}
                  placeholder="none"
                />
              </FormField>
              <FormField label="Delivery address" className="md:col-span-2">
                <Input
                  name="deliveryAddress"
                  defaultValue={shipment.deliveryAddress ?? ''}
                  placeholder="e.g. Malta International Airport"
                />
              </FormField>
              <FormField label="Notes" className="md:col-span-4">
                <Textarea
                  name="notes"
                  defaultValue={shipment.notes ?? ''}
                  rows={2}
                />
              </FormField>
            </div>
          </ActionForm>
        </SectionCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Shipping quotes">
          {quotes.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No quotes yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map(q => (
                    <TableRow key={q.id}>
                      <TableCell>{q.carrierName}</TableCell>
                      <TableCell>{eur(q.quotedAmount)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={q.status === 'ACCEPTED' ? 'green' : 'neutral'}
                        >
                          {q.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {q.status !== 'ACCEPTED' && (
                            <ActionButton
                              small
                              action={setQuoteStatus.bind(
                                null,
                                id,
                                q.id,
                                'ACCEPTED'
                              )}
                            >
                              Accept
                            </ActionButton>
                          )}
                          <ActionButton
                            small
                            variant="danger"
                            action={deleteQuote.bind(null, id, q.id)}
                          >
                            Delete
                          </ActionButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {approved && (
            <ActionForm
              action={addQuote.bind(null, id)}
              submitLabel="Add quote"
              className="mt-3"
            >
              <div className="grid grid-cols-3 gap-2">
                <Input name="carrierName" placeholder="Carrier" required />
                <Input
                  name="quotedAmount"
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  required
                />
                <Input name="quoteDate" type="date" />
              </div>
            </ActionForm>
          )}
        </SectionCard>

        <SectionCard title="Shipment costs">
          {costs.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No costs recorded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.label}</TableCell>
                      <TableCell>{eur(c.amount)}</TableCell>
                      <TableCell>
                        <ActionButton
                          small
                          variant="danger"
                          action={deleteCost.bind(null, id, c.id)}
                        >
                          Delete
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {approved && (
            <ActionForm
              action={addCost.bind(null, id)}
              submitLabel="Add cost"
              className="mt-3"
            >
              <div className="grid grid-cols-3 gap-2">
                <Input name="label" placeholder="Description" required />
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  required
                />
                <Input name="date" type="date" />
              </div>
            </ActionForm>
          )}
        </SectionCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard
          title="Buyer notifications"
          description={
            notificationsConfigured()
              ? 'Sent via Twilio.'
              : 'No SMS/WhatsApp provider configured — messages are logged here so you can see exactly what would go out. Set TWILIO_* in .env to send for real.'
          }
        >
          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {notifications.map(n => (
                <li key={n.id} className="py-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      <strong>{n.buyerName}</strong> ·{' '}
                      {TRIGGER_LABEL[n.trigger as Trigger] ?? n.trigger} ·{' '}
                      {n.channel}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        tone={
                          n.deliveryStatus === 'SENT'
                            ? 'green'
                            : n.deliveryStatus === 'FAILED'
                              ? 'red'
                              : 'neutral'
                        }
                      >
                        {n.deliveryStatus}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(n.createdAt)}
                      </span>
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {n.messageContent}
                  </div>
                  {n.error && (
                    <div className="text-xs text-red-600">{n.error}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Notes">
          <NotesLog
            notes={notes}
            addNote={addNote.bind(null, 'SHIPMENT', id)}
            deleteNote={deleteNote.bind(null, 'SHIPMENT', id)}
          />
        </SectionCard>
      </div>

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

      {approved && items.length === 0 && (
        <SectionCard title="Danger zone">
          <ActionButton
            variant="danger"
            action={deleteShipment.bind(null, id)}
            confirm="Delete this empty shipment?"
          >
            Delete shipment
          </ActionButton>
        </SectionCard>
      )}
    </ProfilePageLayout>
  )
}
