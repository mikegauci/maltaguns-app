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
  SHIPMENT_STATUSES,
} from '@/lib/armory/queries'
import {
  summariseShipment,
  eur,
  ALLOCATION_METHODS,
} from '@/lib/armory/accounting'
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
import {
  Card,
  Field,
  Input,
  Select,
  Textarea,
  Badge,
  SHIPMENT_STATUS_TONE,
  Table,
  th,
  td,
  Empty,
  fmtDate,
  Stat,
  Warn,
  BackLink,
} from '@/components/armory/ui'
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

  const [items, buyers, quotes, costs, docs, notes] = await Promise.all([
    listItemsForShipment(account.id, id),
    listBuyers(account.id),
    listQuotes(id),
    listCosts(id),
    listDocuments(account.id, { shipmentId: id }),
    listNotes(account.id, 'SHIPMENT', id),
  ])
  const activeBuyers = buyers.filter(b => !b.anonymisedAt)
  const summary = summariseShipment(
    shipment,
    items,
    costs,
    account.shippingAllocationMethod
  )
  const statusLabel =
    SHIPMENT_STATUSES.find(s => s.value === shipment.status)?.label ??
    shipment.status

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink href={BASE}>All shipments</BackLink>
          <h1 className="text-xl font-semibold mt-1 flex items-center gap-2">
            {shipment.reference}{' '}
            <Badge tone={SHIPMENT_STATUS_TONE[shipment.status]}>
              {statusLabel}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground">
            Created {fmtDate(shipment.createdAt)} · {items.length} items (
            {items.filter(i => i.itemType === 'FIREARM').length} firearms)
            {shipment.priorConsentRef &&
              ` · Prior consent ${shipment.priorConsentRef}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`${BASE}/print/prior-consent/${id}?mode=full`}
              target="_blank"
            >
              Print Prior Consent
            </a>
          </Button>
        </div>
      </div>

      {sp.imported && (
        <div className="rounded border border-emerald-300 bg-emerald-50 text-emerald-900 text-sm px-3 py-2">
          Imported {sp.imported} item(s)
          {sp.skipped && sp.skipped !== '0'
            ? `, ${sp.skipped} row(s) skipped`
            : ''}
          .
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat
          label="Acquisition (items + DE shipping)"
          value={eur(summary.acquisition)}
        />
        <Stat
          label="Shipment costs"
          value={eur(summary.shippingCosts)}
          sub={
            ALLOCATION_METHODS.find(
              m => m.value === account.shippingAllocationMethod
            )?.label
          }
        />
        <Stat label="Revenue (sales + fees)" value={eur(summary.revenue)} />
        <Stat
          label="Profit so far"
          value={eur(summary.profit)}
          tone={summary.profit >= 0 ? 'good' : 'bad'}
          sub={`${eur(summary.unsoldCost)} still in stock`}
        />
        <Stat
          label="Outstanding from buyers"
          value={eur(summary.outstanding)}
          tone={summary.outstanding > 0 ? 'bad' : undefined}
        />
      </section>

      <Card
        title="Status"
        description="Moving to Prior consent submitted, Shipped or Ready for collection can notify buyers who opted in."
      >
        <StatusControls
          shipmentId={id}
          current={shipment.status}
          statuses={SHIPMENT_STATUSES}
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
          <Warn
            tone="red"
            items={[
              `Prior consent rejected${shipment.permitRejectedReason ? `: ${shipment.permitRejectedReason}` : ''}. Fix the missing information and re-submit.`,
            ]}
          />
        )}
      </Card>

      <Card
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
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card
          title="Origin dealer (sender)"
          description="Section 3 of the Prior Consent."
        >
          <ActionForm
            action={updateShipment.bind(null, id)}
            submitLabel="Save sender"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reference">
                <Input
                  name="reference"
                  defaultValue={shipment.reference}
                  required
                />
              </Field>
              <Field label="Sender is a">
                <Select
                  name="senderType"
                  defaultValue={shipment.senderType ?? 'COMPANY'}
                >
                  <option value="COMPANY">Company / dealer</option>
                  <option value="PERSON">Natural person</option>
                </Select>
              </Field>
              <Field label="Company name">
                <Input
                  name="senderCompanyName"
                  defaultValue={shipment.senderCompanyName ?? ''}
                />
              </Field>
              <Field label="Country">
                <Input
                  name="senderCountry"
                  defaultValue={shipment.senderCountry ?? ''}
                />
              </Field>
              <Field label="Address" className="col-span-2">
                <Textarea
                  name="senderAddress"
                  defaultValue={shipment.senderAddress ?? ''}
                  rows={2}
                />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <Card title="Transit & delivery">
          <ActionForm
            action={updateShipment.bind(null, id)}
            submitLabel="Save transit"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Carrier">
                <Input name="carrier" defaultValue={shipment.carrier ?? ''} />
              </Field>
              <Field label="Transit countries">
                <Input
                  name="transitCountries"
                  defaultValue={shipment.transitCountries ?? ''}
                />
              </Field>
              <Field label="Delivery address" className="col-span-2">
                <Textarea
                  name="deliveryAddress"
                  defaultValue={shipment.deliveryAddress ?? ''}
                  rows={2}
                />
              </Field>
              <Field label="Notes" className="col-span-2">
                <Textarea
                  name="notes"
                  defaultValue={shipment.notes ?? ''}
                  rows={2}
                />
              </Field>
            </div>
          </ActionForm>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Shipping quotes">
          {quotes.length === 0 ? (
            <Empty>No quotes yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Carrier</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Status</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id}>
                    <td className={td}>{q.carrierName}</td>
                    <td className={td}>{eur(q.quotedAmount)}</td>
                    <td className={td}>
                      <Badge
                        tone={q.status === 'ACCEPTED' ? 'green' : 'neutral'}
                      >
                        {q.status}
                      </Badge>
                    </td>
                    <td className={td}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
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
        </Card>

        <Card title="Shipment costs">
          {costs.length === 0 ? (
            <Empty>No costs recorded.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Label</th>
                  <th className={th}>Amount</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {costs.map(c => (
                  <tr key={c.id}>
                    <td className={td}>{c.label}</td>
                    <td className={td}>{eur(c.amount)}</td>
                    <td className={td}>
                      <ActionButton
                        small
                        variant="danger"
                        action={deleteCost.bind(null, id, c.id)}
                      >
                        Delete
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
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
        </Card>
      </div>

      <Card title="Notes">
        <NotesLog
          notes={notes}
          addNote={addNote.bind(null, 'SHIPMENT', id)}
          deleteNote={deleteNote.bind(null, 'SHIPMENT', id)}
        />
      </Card>

      {docs.length > 0 && (
        <Card title="Generated documents">
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
        </Card>
      )}

      {approved && items.length === 0 && (
        <Card title="Danger zone">
          <ActionButton
            variant="danger"
            action={deleteShipment.bind(null, id)}
            confirm="Delete this empty shipment?"
          >
            Delete shipment
          </ActionButton>
        </Card>
      )}
    </>
  )
}
