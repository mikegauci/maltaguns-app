// Builds the data that goes onto the two government documents and records
// each generation in generated_document (snapshot + what was missing at
// print time), so there is always an answer to "what exactly was printed".
import { createClient } from '@/lib/supabase/server'
import type { DealerAccount, ItemRow, ShipmentRow, BuyerRow } from './types'
import {
  classify,
  PROFORMA_LOADING_OPTIONS,
  PROFORMA_BARREL_HAMMER_OPTIONS,
  SCHEDULE_LINE_ITEMS,
  PURCHASE_PURPOSE_OPTIONS,
  SIGHT_OPTIONS,
  type SightType,
} from './classification'

export type Field = {
  label: string
  value: string | null
  required?: boolean
  key: string
}

function f(key: string, label: string, value: unknown, required = true): Field {
  const v =
    value === null || value === undefined || value === '' ? null : String(value)
  return { key, label, value: v, required }
}

export function missingOf(fields: Field[]): string[] {
  return fields.filter(x => x.required && !x.value).map(x => x.label)
}

// ---------------------------------------------------------------------------
// Prior Consent — Article 11(4) Directive 91/477/EEC (import document)
// ---------------------------------------------------------------------------

export type PriorConsentAnnexRow = {
  no: number
  itemId: string
  euCategory: string
  quantityType: string
  makeModel: string
  calibre: string
  otherFeatures: string
  cipProof: string // "Yes" | "No" | ""
  serialNumber: string
  scheduleImportDoc: string
  warnings: string[]
}

export type PriorConsentData = {
  destinationMemberState: string
  recipient: Field[]
  sender: Field[]
  annex: PriorConsentAnnexRow[]
  missing: string[]
  warnings: string[]
  generatedAt: string
  shipmentReference: string
}

export function buildPriorConsent(
  account: DealerAccount,
  shipment: ShipmentRow,
  items: ItemRow[]
): PriorConsentData {
  const recipient: Field[] = [
    f('recipient.surname', 'Surname', account.contactSurname),
    f('recipient.firstNames', 'First name(s)', account.contactFirstNames),
    f('recipient.dob', 'Date of birth', account.contactDateOfBirth),
    f('recipient.pob', 'Place of birth', account.contactPlaceOfBirth),
    f('recipient.passport', 'Passport / ID number', account.passportIdNumber),
    f('recipient.passportIssue', 'Date of issue', account.passportIssueDate),
    f(
      'recipient.passportAuthority',
      'Issuing authority',
      account.passportIssuingAuthority
    ),
    f('recipient.company', 'Company name', account.companyName),
    f(
      'recipient.address',
      'Address / registered office',
      account.registeredAddress
    ),
    f('recipient.phone', 'Telephone', account.phoneNumber),
    f('recipient.fax', 'Fax', account.faxNumber, false),
    f(
      'recipient.dealerLicence',
      'Dealer licence number',
      account.dealerLicenceNumber
    ),
    f(
      'recipient.dealerLicenceExpiry',
      'Dealer licence expiry',
      account.dealerLicenceExpiry,
      false
    ),
  ]

  const isCompany = shipment.senderType === 'COMPANY'
  const sender: Field[] = [
    f(
      'sender.type',
      'Sender type',
      shipment.senderType === 'COMPANY'
        ? 'Company / dealer'
        : shipment.senderType === 'PERSON'
          ? 'Natural person'
          : null
    ),
    f('sender.company', 'Company name', shipment.senderCompanyName, isCompany),
    f(
      'sender.registeredOffice',
      'Registered office',
      shipment.senderRegisteredOffice,
      isCompany
    ),
    f('sender.surname', 'Surname', shipment.senderSurname, !isCompany),
    f(
      'sender.firstNames',
      'First name(s)',
      shipment.senderFirstNames,
      !isCompany
    ),
    f('sender.dob', 'Date of birth', shipment.senderDateOfBirth, !isCompany),
    f('sender.pob', 'Place of birth', shipment.senderPlaceOfBirth, !isCompany),
    f(
      'sender.passport',
      'Passport / ID number',
      shipment.senderPassportId,
      !isCompany
    ),
    f('sender.passportIssue', 'Date of issue', shipment.senderIssueDate, false),
    f(
      'sender.passportAuthority',
      'Issuing authority',
      shipment.senderIssuingAuthority,
      false
    ),
    f('sender.address', 'Address', shipment.senderAddress),
    f('sender.country', 'Country', shipment.senderCountry),
    f('sender.phone', 'Telephone', shipment.senderPhone, false),
    f('sender.fax', 'Fax', shipment.senderFax, false),
  ]

  const warnings: string[] = []
  const annexItems = items.filter(i => i.itemType !== 'ACCESSORY') // accessories don't go on the import document
  const annex: PriorConsentAnnexRow[] = annexItems.map((i, idx) => {
    const c = classify({
      itemType: i.itemType,
      category: i.category,
      fireMode: i.fireMode,
      loading: i.loading,
      yearOfManufacture: i.yearOfManufacture,
      calibreRaw: i.calibreRaw ?? i.calibreDisplay,
      serialNumber: i.serialNumber,
      deactivated: i.deactivated,
      typeDescription: i.typeDescription,
      make: i.make,
      model: i.model,
    })
    const typeLabel =
      i.itemType === 'FIREARM'
        ? (i.category ?? 'Firearm').replace(/_/g, ' ').toLowerCase()
        : (i.typeDescription ?? 'Essential component')
    const rowWarnings = [...c.blockers, ...c.warnings]
    warnings.push(
      ...rowWarnings.map(
        w => `Item ${idx + 1} (${i.make ?? ''} ${i.model ?? ''}): ${w}`
      )
    )
    return {
      no: idx + 1,
      itemId: i.id,
      euCategory: i.euCategory ?? c.euCategory ?? '',
      quantityType: `${i.quantity} × ${typeLabel}`,
      makeModel: [i.make, i.model].filter(Boolean).join(' / '),
      calibre: i.calibreDisplay ?? c.calibre.display,
      otherFeatures: [
        i.otherFeatures,
        i.yearOfManufacture ? `mfg. ${i.yearOfManufacture}` : null,
        i.countryOfManufacture,
      ]
        .filter(Boolean)
        .join('; '),
      cipProof: i.cipProof === true ? 'Yes' : i.cipProof === false ? 'No' : '',
      serialNumber: i.serialNumber ?? '',
      scheduleImportDoc: i.scheduleImportDoc ?? c.scheduleImportDoc ?? '',
      warnings: rowWarnings,
    }
  })

  const missing = [...missingOf(recipient), ...missingOf(sender)]
  if (annex.length === 0)
    missing.push('At least one firearm or essential component in the shipment')
  annex.forEach(r => {
    if (!r.serialNumber) missing.push(`Serial number — annex item ${r.no}`)
    if (!r.cipProof) missing.push(`CIP proof (yes/no) — annex item ${r.no}`)
    if (!r.calibre) missing.push(`Calibre — annex item ${r.no}`)
  })

  return {
    destinationMemberState: 'Malta',
    recipient,
    sender,
    annex,
    missing,
    warnings,
    generatedAt: new Date().toISOString(),
    shipmentReference: shipment.reference,
  }
}

// ---------------------------------------------------------------------------
// Transfer proforma — Malta Police Weapons Office
// ---------------------------------------------------------------------------

// Data for the transfer proforma print page (src/app/print/proforma/page.tsx),
// which renders the dealer's own redesigned "Proforma for the Transfer of a
// Firearm" layout — a clean typeset re-creation of the Weapons Office form,
// not an overlay on the scanned original. Every field here maps onto a named
// blank or checkbox group on that design.
export type ProformaData = {
  make: string | null
  model: string | null
  serialNumber: string | null
  yearOfManufacture: string | null
  countryOfManufacture: string | null
  gauge: string | null
  calibre: string | null
  /** Combined "Cal/Gauge" field for the redesigned form's single line —
   *  gauge takes priority (shotguns), falling back to calibre. */
  calGauge: string | null
  capacity: number | null
  /** Multi-select — a firearm can tick more than one (e.g. both "Automatic"
   *  and "With Ejector/Extractor"). Only the schedule line item below is a
   *  single tick. */
  proformaLoading: { code: string; label: string }[]
  proformaBarrelHammer: { code: string; label: string }[]
  sights: SightType[]
  scheduleLineItem: {
    code: string
    label: string
    schedule: 'I' | 'II' | 'III'
  } | null
  purchasePurpose: { code: string; label: string } | null
  buyerName: string | null
  missing: string[]
  warnings: string[]
  itemId: string
  generatedAt: string
}

export function buildProforma(
  account: DealerAccount,
  item: ItemRow,
  buyer: BuyerRow | null
): ProformaData {
  const c = classify({
    itemType: item.itemType,
    category: item.category,
    fireMode: item.fireMode,
    loading: item.loading,
    yearOfManufacture: item.yearOfManufacture,
    calibreRaw: item.calibreRaw ?? item.calibreDisplay,
    serialNumber: item.serialNumber,
    deactivated: item.deactivated,
    make: item.make,
    model: item.model,
  })

  const loadingSet = new Set(
    (item.proformaLoading ?? '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
  )
  const loadingOpts = PROFORMA_LOADING_OPTIONS.filter(o =>
    loadingSet.has(o.value)
  )
  const barrelHammerSet = new Set(
    (item.proformaBarrelHammer ?? '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
  )
  const barrelHammerOpts = PROFORMA_BARREL_HAMMER_OPTIONS.filter(o =>
    barrelHammerSet.has(o.value)
  )
  const scheduleOpt =
    SCHEDULE_LINE_ITEMS.find(s => s.code === item.scheduleLineItemCode) ?? null
  const purposeOpt =
    PURCHASE_PURPOSE_OPTIONS.find(o => o.code === item.buyerLicenceType) ?? null
  const sightSet = new Set(
    (item.sightsType ?? '').split(',').map(s => s.trim().toUpperCase())
  )
  const sights = SIGHT_OPTIONS.filter(s => sightSet.has(s))

  const missing: string[] = []
  if (!item.make) missing.push('Make')
  if (!item.model) missing.push('Model')
  if (!item.serialNumber) missing.push('Serial number')
  if (!(item.gauge ?? item.calibreDisplay ?? c.calibre.display))
    missing.push('Calibre / Gauge')
  if (loadingOpts.length === 0) missing.push('Loading (tick at least one)')
  if (barrelHammerOpts.length === 0)
    missing.push('Barrel/Hammer (tick at least one)')
  if (sights.length === 0) missing.push('Sights (tick at least one)')
  if (!scheduleOpt)
    missing.push(
      'Schedule / classification line item (tick one — must be confirmed by the dealer)'
    )
  if (!buyer) missing.push('Buyer (assign the item to a buyer first)')

  const warnings = [...c.blockers, ...c.warnings]

  return {
    make: item.make,
    model: item.model,
    serialNumber: item.serialNumber,
    yearOfManufacture: item.yearOfManufacture,
    countryOfManufacture: item.countryOfManufacture,
    gauge: item.gauge,
    calibre: item.calibreDisplay ?? c.calibre.display ?? null,
    calGauge: item.gauge ?? item.calibreDisplay ?? c.calibre.display ?? null,
    capacity: item.capacity,
    proformaLoading: loadingOpts.map(o => ({ code: o.value, label: o.label })),
    proformaBarrelHammer: barrelHammerOpts.map(o => ({
      code: o.value,
      label: o.label,
    })),
    sights,
    scheduleLineItem: scheduleOpt
      ? {
          code: scheduleOpt.code,
          label: scheduleOpt.label,
          schedule: scheduleOpt.schedule,
        }
      : null,
    purchasePurpose: purposeOpt
      ? { code: purposeOpt.code, label: purposeOpt.label }
      : null,
    buyerName: buyer ? `${buyer.firstNames} ${buyer.surname}` : null,
    missing,
    warnings,
    itemId: item.id,
    generatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

export async function recordDocument(opts: {
  dealerAccountId: string
  userId: string | null
  docType: 'PRIOR_CONSENT' | 'TRANSFER_PROFORMA'
  generationMethod: 'AUTO_FILLED' | 'BLANK_MANUAL'
  shipmentId?: string | null
  inventoryItemId?: string | null
  snapshot: unknown
  missing: string[]
}): Promise<{ id: string; version: number }> {
  const supabase = await createClient()
  let query = supabase
    .from('armory_generated_documents')
    .select('version')
    .eq('dealer_account_id', opts.dealerAccountId)
    .eq('doc_type', opts.docType)

  if (opts.shipmentId) query = query.eq('shipment_id', opts.shipmentId)
  else query = query.is('shipment_id', null)
  if (opts.inventoryItemId)
    query = query.eq('inventory_item_id', opts.inventoryItemId)
  else query = query.is('inventory_item_id', null)

  const { data: prevRows } = await query
    .order('version', { ascending: false })
    .limit(1)
  const version = (prevRows?.[0]?.version ?? 0) + 1

  const { data, error } = await supabase
    .from('armory_generated_documents')
    .insert({
      dealer_account_id: opts.dealerAccountId,
      shipment_id: opts.shipmentId ?? null,
      inventory_item_id: opts.inventoryItemId ?? null,
      doc_type: opts.docType,
      generation_method: opts.generationMethod,
      version,
      data_snapshot: opts.snapshot as Record<string, unknown>,
      missing_fields_at_print: opts.missing.length ? opts.missing : null,
      created_by: opts.userId,
    })
    .select('id, version')
    .single()

  if (error || !data)
    throw new Error(error?.message ?? 'Failed to record document')
  return { id: data.id, version: data.version }
}
