import { notFound } from 'next/navigation'
import { requireApprovedDealer } from '@/lib/armory/auth'
import { getItem, getBuyer } from '@/lib/armory/queries'
import {
  buildProforma,
  recordDocument,
  type ProformaData,
} from '@/lib/armory/documents'
import { audit } from '@/lib/armory/audit'
import { createClient } from '@/lib/supabase/server'
import { Warnings } from '../fields'
import { EditableFieldValue, EditableCapacity, TickCell } from './editable'
import {
  PROFORMA_LOADING_OPTIONS,
  PROFORMA_BARREL_HAMMER_OPTIONS,
  SCHEDULE_LINE_ITEMS,
  PURCHASE_PURPOSE_OPTIONS,
  SIGHT_PRINT_ORDER,
  SIGHT_LABELS,
} from '@/lib/armory/classification'

export const dynamic = 'force-dynamic'

export default async function ProformaPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string; blank?: string; edit?: string }>
}) {
  const sp = await searchParams
  const ctx = await requireApprovedDealer()
  const account = ctx.dealerAccount
  const isBlank = sp.blank === '1'
  const ids = (sp.items ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (ids.length === 0 && !isBlank) notFound()
  const editable = sp.edit === '1' && !isBlank && ids.length === 1

  const pages: { data: ProformaData | null; title: string; version: number }[] =
    []
  const allMissing: string[] = []
  const allWarnings: string[] = []
  const skippedIds: string[] = []
  const supabase = await createClient()
  const now = new Date().toISOString()

  if (isBlank) {
    const one = ids[0] ? await getItem(account.id, ids[0]) : null
    const rec = await recordDocument({
      dealerAccountId: account.id,
      userId: ctx.userId,
      docType: 'TRANSFER_PROFORMA',
      generationMethod: 'BLANK_MANUAL',
      shipmentId: one?.shipmentId ?? null,
      inventoryItemId: one?.id ?? null,
      snapshot: {},
      missing: [],
    })
    if (one?.currentHolderBuyerId) {
      await supabase
        .from('armory_inventory_items')
        .update({
          status:
            one.status === 'AVAILABLE' || one.status === 'RESERVED'
              ? 'PENDING_TRANSFER'
              : one.status,
          transfer_doc_printed_at: one.transferDocPrintedAt ?? now,
          updated_at: now,
        })
        .eq('id', one.id)
        .eq('dealer_account_id', account.id)
    }
    await audit('DOCUMENT_GENERATED', {
      userId: ctx.userId,
      dealerAccountId: account.id,
      entityType: 'generated_document',
      entityId: rec.id,
      details: { docType: 'TRANSFER_PROFORMA', blank: true, itemId: one?.id },
    })
    pages.push({ data: null, title: 'Blank', version: rec.version })
  } else {
    for (const id of ids) {
      const item = await getItem(account.id, id)
      if (!item || item.itemType !== 'FIREARM') {
        skippedIds.push(id)
        continue
      }
      const buyer = item.currentHolderBuyerId
        ? await getBuyer(account.id, item.currentHolderBuyerId)
        : null
      const data = buildProforma(account, item, buyer ?? null)
      const rec = await recordDocument({
        dealerAccountId: account.id,
        userId: ctx.userId,
        docType: 'TRANSFER_PROFORMA',
        generationMethod: 'AUTO_FILLED',
        shipmentId: item.shipmentId,
        inventoryItemId: item.id,
        snapshot: data,
        missing: data.missing,
      })
      if (buyer && item.status !== 'TRANSFERRED') {
        await supabase
          .from('armory_inventory_items')
          .update({
            status: 'PENDING_TRANSFER',
            transfer_doc_printed_at: now,
            updated_at: now,
          })
          .eq('id', item.id)
          .eq('dealer_account_id', account.id)
        await audit('ITEM_TRANSFER_PENDING', {
          userId: ctx.userId,
          dealerAccountId: account.id,
          entityType: 'inventory_item',
          entityId: item.id,
          details: { method: 'AUTO_FILLED', documentId: rec.id },
        })
      }
      await audit('DOCUMENT_GENERATED', {
        userId: ctx.userId,
        dealerAccountId: account.id,
        entityType: 'generated_document',
        entityId: rec.id,
        details: {
          docType: 'TRANSFER_PROFORMA',
          itemId: item.id,
          version: rec.version,
          missing: data.missing.length,
        },
      })
      const label = `${[item.make, item.model].filter(Boolean).join(' ')} (s/n ${item.serialNumber ?? '—'})`
      const prefix = ids.length > 1 ? `${label}: ` : ''
      allMissing.push(...data.missing.map(m => `${prefix}${m}`))
      allWarnings.push(...data.warnings.map(w => `${prefix}${w}`))
      pages.push({ data, title: label, version: rec.version })
    }
    if (pages.length === 0) notFound()
  }

  if (skippedIds.length > 0) {
    allWarnings.unshift(
      `${skippedIds.length} requested item(s) skipped — not found, not firearms, or not in your inventory.`
    )
  }

  return (
    <>
      {!isBlank && <Warnings missing={allMissing} warnings={allWarnings} />}
      {pages.map((p, idx) => (
        <ProformaPage key={idx} data={p.data} editable={editable} />
      ))}
    </>
  )
}

function FieldLine({
  label,
  value,
  itemId,
  field,
  editable,
  numeric,
}: {
  label: string
  value: string | null | undefined
  itemId?: string
  field?: string
  editable?: boolean
  numeric?: boolean
}) {
  return (
    <div className="pf2-field">
      <span className="pf2-field-label">{label}</span>
      {editable && itemId && field ? (
        <EditableFieldValue
          itemId={itemId}
          field={field}
          value={value || null}
          numeric={numeric}
        />
      ) : (
        <span className={'pf2-field-value' + (value ? '' : ' pf2-missing')}>
          {value || ''}
        </span>
      )}
    </div>
  )
}

function CheckGroup({
  options,
  selected,
  itemId,
  field,
  editable,
  multi = false,
}: {
  options: { code: string; label: string }[]
  selected: (code: string) => boolean
  itemId?: string
  field?: string
  editable?: boolean
  multi?: boolean
}) {
  return (
    <div className="pf2-spec-col">
      <div className="pf2-spec-labels">
        {options.map(o => (
          <div className="pf2-row-h" key={o.code}>
            {o.label}
          </div>
        ))}
      </div>
      <div className="pf2-checkcol">
        {options.map(o => (
          <div className="pf2-checkcell" key={o.code}>
            {editable && itemId && field ? (
              <TickCell
                itemId={itemId}
                field={field}
                code={o.code}
                checked={selected(o.code)}
                multi={multi}
              />
            ) : selected(o.code) ? (
              '✓'
            ) : (
              ''
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleBlock({
  title,
  options,
  selected,
  itemId,
  editable,
}: {
  title: string
  options: { code: string; label: string }[]
  selected: (code: string) => boolean
  itemId?: string
  editable?: boolean
}) {
  return (
    <>
      <div className="pf2-section-title">{title}</div>
      <div className="pf2-schedule-block">
        <div className="pf2-schedule-labels">
          {options.map(o => (
            <div className="pf2-row-h" key={o.code}>
              {o.label}
            </div>
          ))}
        </div>
        <div className="pf2-checkcol">
          {options.map(o => (
            <div className="pf2-checkcell" key={o.code}>
              {editable && itemId ? (
                <TickCell
                  itemId={itemId}
                  field="scheduleLineItemCode"
                  code={o.code}
                  checked={selected(o.code)}
                />
              ) : selected(o.code) ? (
                '✓'
              ) : (
                ''
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function ProformaPage({
  data,
  editable = false,
}: {
  data: ProformaData | null
  editable?: boolean
}) {
  const itemId = data?.itemId
  const loadingCodes = new Set((data?.proformaLoading ?? []).map(o => o.code))
  const barrelHammerCodes = new Set(
    (data?.proformaBarrelHammer ?? []).map(o => o.code)
  )
  const scheduleCode = data?.scheduleLineItem?.code ?? null
  const scheduleI = SCHEDULE_LINE_ITEMS.filter(s => s.schedule === 'I')
  const scheduleII = SCHEDULE_LINE_ITEMS.filter(s => s.schedule === 'II')
  const scheduleIII = SCHEDULE_LINE_ITEMS.filter(s => s.schedule === 'III')
  const purposeCode = data?.purchasePurpose?.code ?? null
  const col = (n: 1 | 2 | 3) =>
    PURCHASE_PURPOSE_OPTIONS.filter(o => o.col === n)
  const sightOptions = SIGHT_PRINT_ORDER.map(s => ({
    code: s,
    label: SIGHT_LABELS[s],
  }))
  const sightSelected = (code: string) =>
    !!data?.sights.includes(code as (typeof data.sights)[number])

  return (
    <div className="page">
      <div className="pf2-header">
        <div className="pf2-title">PROFORMA</div>
        <div className="pf2-subtitle">FOR THE TRANSFER OF A FIREARM</div>
      </div>

      {data && data.missing.length > 0 && (
        <span className="pf2-missing-flag no-print">
          {data.missing.length} field(s) not filled — see notice above
        </span>
      )}

      <div className="pf2-section-title">Firearm Details</div>
      <div className="pf2-fields-grid">
        <FieldLine
          label="Make"
          value={data?.make}
          itemId={itemId}
          field="make"
          editable={editable}
        />
        <FieldLine
          label="Country"
          value={data?.countryOfManufacture}
          itemId={itemId}
          field="countryOfManufacture"
          editable={editable}
        />
        <FieldLine
          label="Serial No."
          value={data?.serialNumber}
          itemId={itemId}
          field="serialNumber"
          editable={editable}
        />
        <FieldLine
          label="Model"
          value={data?.model}
          itemId={itemId}
          field="model"
          editable={editable}
        />
        <FieldLine
          label="Year"
          value={data?.yearOfManufacture}
          itemId={itemId}
          field="yearOfManufacture"
          editable={editable}
        />
        <FieldLine
          label="Cal/Gauge"
          value={data?.calGauge}
          itemId={itemId}
          field="calGauge"
          editable={editable}
        />
      </div>

      <div className="pf2-section-title">Firearm Specifications</div>
      <div className="pf2-spec-row">
        <CheckGroup
          options={PROFORMA_LOADING_OPTIONS.map(o => ({
            code: o.value,
            label: o.label,
          }))}
          selected={code => loadingCodes.has(code)}
          itemId={itemId}
          field="proformaLoadingToggle"
          editable={editable}
          multi
        />
        <CheckGroup
          options={PROFORMA_BARREL_HAMMER_OPTIONS.map(o => ({
            code: o.value,
            label: o.label,
          }))}
          selected={code => barrelHammerCodes.has(code)}
          itemId={itemId}
          field="proformaBarrelHammerToggle"
          editable={editable}
          multi
        />
        <div className="pf2-spec-col">
          <div className="pf2-spec-labels">
            {sightOptions.map(o => (
              <div className="pf2-row-h" key={o.code}>
                {o.label}
              </div>
            ))}
            <div className="pf2-row-h">Capacity</div>
          </div>
          <div className="pf2-checkcol pf2-checkcol-wide">
            {sightOptions.map(o => (
              <div className="pf2-checkcell" key={o.code}>
                {editable && itemId ? (
                  <TickCell
                    itemId={itemId}
                    field="sightsToggle"
                    code={o.code}
                    checked={sightSelected(o.code)}
                    multi
                  />
                ) : sightSelected(o.code) ? (
                  '✓'
                ) : (
                  ''
                )}
              </div>
            ))}
            <div className="pf2-checkcell">
              {editable && itemId ? (
                <EditableCapacity
                  itemId={itemId}
                  value={data?.capacity ?? null}
                />
              ) : (
                (data?.capacity ?? '')
              )}
            </div>
          </div>
        </div>
      </div>

      <ScheduleBlock
        title="Classification under Schedule I"
        options={scheduleI.map(s => ({ code: s.code, label: s.label }))}
        selected={code => code === scheduleCode}
        itemId={itemId}
        editable={editable}
      />
      <ScheduleBlock
        title="Classification under Schedule II"
        options={scheduleII.map(s => ({ code: s.code, label: s.label }))}
        selected={code => code === scheduleCode}
        itemId={itemId}
        editable={editable}
      />
      <ScheduleBlock
        title="Classification under Schedule III"
        options={scheduleIII.map(s => ({ code: s.code, label: s.label }))}
        selected={code => code === scheduleCode}
        itemId={itemId}
        editable={editable}
      />

      <div className="pf2-section-title">
        Licence Type or Purpose of Acquisition
      </div>
      <div className="pf2-purpose-grid">
        {([1, 2, 3] as const).map(n => (
          <CheckGroup
            key={n}
            options={col(n).map(o => ({ code: o.code, label: o.label }))}
            selected={code => code === purposeCode}
            itemId={itemId}
            field="buyerLicenceType"
            editable={editable}
          />
        ))}
      </div>

      <div className="pf2-sig-row">
        <div>
          <div className="pf2-sig-line">Signature of Seller</div>
          <div className="pf2-sig-id">ID No. _______________</div>
        </div>
        <div>
          <div className="pf2-sig-line">Signature of Purchaser</div>
          <div className="pf2-sig-id">ID No. _______________</div>
        </div>
        <div>
          <div className="pf2-sig-line">Witness to Signature</div>
          <div className="pf2-sig-id">Rank &amp; No. _______________</div>
        </div>
      </div>

      <div className="pf2-footer">
        This form is to be filled in for each firearm and accompany each and
        every application filed with the Police referring to the sale, purchase,
        transfer and/or any other transaction of any firearm/arms proper. Wrong
        information or missing details may invalidate the application and may
        lead to Criminal prosecution.
      </div>
    </div>
  )
}
