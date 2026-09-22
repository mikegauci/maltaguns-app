'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { audit } from '@/lib/armory/audit'
import {
  classify,
  defaultHandlingFee,
  type ItemType,
} from '@/lib/armory/classification'
import {
  getDealerAccount,
  getItem,
  getShipment,
  TRASH_RETENTION_DAYS,
} from '@/lib/armory/queries'
import {
  ActionError,
  run,
  str,
  num,
  int,
  tri,
  type ActionResult,
} from './action-utils'
import { dealerCtx } from './_helpers'

const BASE = '/profile/armory'
const WALK_IN_SHIPMENT_REFERENCE = 'Local purchases (no import)'

type ItemInput = {
  itemType: ItemType
  category: string | null
  typeDescription: string | null
  make: string | null
  model: string | null
  quantity: number
  serialNumber: string | null
  calibreRaw: string | null
  countryOfManufacture: string | null
  yearOfManufacture: string | null
  loading: string | null
  barrelType: string | null
  hammerType: string | null
  sightsType: string | null
  capacity: number | null
  fireMode: string
  cipProof: boolean | null
  deactivated: boolean
  deactivationCertRef: string | null
  originalSeller: string | null
  egunListingId: string | null
  egunListingUrl: string | null
  acquisitionPrice: number | null
  egunDomesticShippingFee: number | null
  salePrice: number | null
  clientHandlingFee: number | null
  otherFeatures: string | null
  notes: string | null
  buyerLicenceType: string | null
  buyerLicenceNumber: string | null
  proformaLoading: string | null
  proformaBarrelHammer: string | null
  scheduleLineItemCode: string | null
}

function readItemForm(fd: FormData): ItemInput {
  const itemType = (str(fd, 'itemType') ?? 'FIREARM') as ItemType
  if (!['FIREARM', 'REGULATED_COMPONENT', 'ACCESSORY'].includes(itemType)) {
    throw new ActionError('Invalid item type')
  }
  const sights =
    fd.getAll('sightsType').map(String).filter(Boolean).join(',') ||
    str(fd, 'sightsTypeText')
  const proformaLoading =
    fd.getAll('proformaLoading').map(String).filter(Boolean).join(',') || null
  const proformaBarrelHammer =
    fd.getAll('proformaBarrelHammer').map(String).filter(Boolean).join(',') ||
    null
  const egunRaw = str(fd, 'egunListingId')
  const egunId = egunRaw ?? null
  return {
    itemType,
    category: itemType === 'FIREARM' ? str(fd, 'category') : null,
    typeDescription: str(fd, 'typeDescription'),
    make: str(fd, 'make'),
    model: str(fd, 'model'),
    quantity: int(fd, 'quantity') ?? 1,
    serialNumber: str(fd, 'serialNumber'),
    calibreRaw: str(fd, 'calibreRaw'),
    countryOfManufacture: str(fd, 'countryOfManufacture'),
    yearOfManufacture: str(fd, 'yearOfManufacture'),
    loading: str(fd, 'loading'),
    barrelType: str(fd, 'barrelType'),
    hammerType: str(fd, 'hammerType'),
    sightsType: sights,
    capacity: int(fd, 'capacity'),
    fireMode:
      itemType === 'FIREARM'
        ? (str(fd, 'fireMode') ?? 'NOT_APPLICABLE')
        : 'NOT_APPLICABLE',
    cipProof: tri(fd, 'cipProof'),
    deactivated: fd.get('deactivated') === 'on',
    deactivationCertRef: str(fd, 'deactivationCertRef'),
    originalSeller: str(fd, 'originalSeller'),
    egunListingId: egunId,
    egunListingUrl: egunId
      ? `https://www.egun.de/market/item.php?id=${egunId}`
      : null,
    acquisitionPrice: num(fd, 'acquisitionPrice'),
    egunDomesticShippingFee: num(fd, 'egunDomesticShippingFee'),
    salePrice: num(fd, 'salePrice'),
    clientHandlingFee: num(fd, 'clientHandlingFee'),
    otherFeatures: str(fd, 'otherFeatures'),
    notes: str(fd, 'notes'),
    buyerLicenceType: str(fd, 'buyerLicenceType'),
    buyerLicenceNumber: str(fd, 'buyerLicenceNumber'),
    proformaLoading,
    proformaBarrelHammer,
    scheduleLineItemCode: str(fd, 'scheduleLineItemCode'),
  }
}

function derive(
  input: ItemInput,
  keepOverride?: {
    scheduleOverridden: boolean
    scheduleProforma: string | null
    scheduleImportDoc: string | null
  }
) {
  const c = classify({ ...input, deactivated: input.deactivated })
  if (c.blockers.length && input.itemType === 'ACCESSORY')
    throw new ActionError(c.blockers[0])
  const overridden = keepOverride?.scheduleOverridden === true
  return {
    calibreDisplay: c.calibre.display || null,
    gauge: c.calibre.gauge,
    scheduleProforma: overridden
      ? keepOverride!.scheduleProforma
      : c.scheduleProforma,
    scheduleImportDoc: overridden
      ? keepOverride!.scheduleImportDoc
      : c.scheduleImportDoc,
    euCategory: c.euCategory,
    warnings: c.warnings,
    blockers: c.blockers,
  }
}

function itemRowFromInput(
  input: ItemInput,
  d: ReturnType<typeof derive>,
  ctx: { dealerAccountId: string; shipmentId: string; handling: number | null }
) {
  return {
    dealer_account_id: ctx.dealerAccountId,
    shipment_id: ctx.shipmentId,
    item_type: input.itemType,
    category: input.category,
    type_description: input.typeDescription,
    make: input.make,
    model: input.model,
    quantity: input.quantity,
    serial_number: input.serialNumber,
    calibre_raw: input.calibreRaw,
    calibre_display: d.calibreDisplay,
    gauge: d.gauge,
    country_of_manufacture: input.countryOfManufacture,
    year_of_manufacture: input.yearOfManufacture,
    loading: input.loading,
    barrel_type: input.barrelType,
    hammer_type: input.hammerType,
    sights_type: input.sightsType,
    capacity: input.capacity,
    fire_mode: input.fireMode,
    cip_proof: input.cipProof,
    schedule_proforma: d.scheduleProforma,
    schedule_import_doc: d.scheduleImportDoc,
    eu_category: d.euCategory,
    deactivated: input.deactivated,
    deactivation_cert_ref: input.deactivationCertRef,
    original_seller: input.originalSeller,
    egun_listing_id: input.egunListingId,
    egun_listing_url: input.egunListingUrl,
    acquisition_price: input.acquisitionPrice,
    egun_domestic_shipping_fee: input.egunDomesticShippingFee,
    sale_price: input.salePrice,
    client_handling_fee: ctx.handling,
    other_features: input.otherFeatures,
    notes: input.notes,
    buyer_licence_type: input.buyerLicenceType,
    buyer_licence_number: input.buyerLicenceNumber,
    proforma_loading: input.proformaLoading,
    proforma_barrel_hammer: input.proformaBarrelHammer,
    schedule_line_item_code: input.scheduleLineItemCode,
    current_holder_type: 'DEALER_STOCK' as const,
    status: 'AVAILABLE' as const,
    payment_status: 'UNPAID' as const,
  }
}

async function getOrCreateWalkInShipment(
  dealerAccountId: string
): Promise<string> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('armory_shipments')
    .select('id')
    .eq('dealer_account_id', dealerAccountId)
    .eq('reference', WALK_IN_SHIPMENT_REFERENCE)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('armory_shipments')
    .insert({
      dealer_account_id: dealerAccountId,
      reference: WALK_IN_SHIPMENT_REFERENCE,
      status: 'ARRIVED',
      sender_type: 'PERSON',
    })
    .select('id')
    .single()

  if (error || !data)
    throw new ActionError(
      error?.message ?? 'Failed to create local purchases shipment'
    )
  return data.id
}

export async function createDirectItem(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const shipmentId = await getOrCreateWalkInShipment(ctx.dealerAccount.id)
    const r = await createItem(shipmentId, fd)
    if (!r.ok) throw new ActionError(r.error)
    revalidatePath(`${BASE}/inventory`)
    return { ok: true, id: r.id, message: r.message ?? 'Added to inventory' }
  })
}

export async function createItem(
  shipmentId: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    if (!(await getShipment(ctx.dealerAccount.id, shipmentId)))
      throw new ActionError('Shipment not found')
    const input = readItemForm(fd)
    if (!input.make || !input.model)
      throw new ActionError('Make and model are required')
    const d = derive(input)
    const account = (await getDealerAccount(ctx.dealerAccount.id))!
    const handling =
      input.clientHandlingFee ??
      (input.itemType === 'FIREARM'
        ? defaultHandlingFee(
            input.category,
            account.defaultHandlingFeeRifle,
            account.defaultHandlingFeePistol
          )
        : null)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('armory_inventory_items')
      .insert(
        itemRowFromInput(input, d, {
          dealerAccountId: ctx.dealerAccount.id,
          shipmentId,
          handling,
        })
      )
      .select('id')
      .single()

    if (error || !data)
      throw new ActionError(error?.message ?? 'Failed to create item')

    await supabase.from('armory_ownership_events').insert({
      inventory_item_id: data.id,
      event_type: 'IMPORT',
      from_label: input.originalSeller ?? 'Origin seller',
      to_label: `${account.companyName} (dealer stock)`,
      event_date: new Date().toISOString().slice(0, 10),
    })

    await audit('ITEM_CREATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: data.id,
      details: {
        itemType: input.itemType,
        make: input.make,
        model: input.model,
        serialNumber: input.serialNumber,
      },
    })
    revalidatePath(`${BASE}/shipments/${shipmentId}`)
    const warn = [...d.blockers, ...d.warnings]
    return {
      ok: true,
      id: data.id,
      message: warn.length
        ? `Item added — check: ${warn.join(' · ')}`
        : 'Item added',
    }
  })
}

export async function updateItem(
  id: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const existing = await getItem(ctx.dealerAccount.id, id)
    if (!existing) throw new ActionError('Item not found')
    if (existing.status === 'TRANSFERRED')
      throw new ActionError('Transferred items are locked. Add a note instead.')
    const input = readItemForm(fd)
    if (!input.make || !input.model)
      throw new ActionError('Make and model are required')
    const d = derive(input, existing)

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        ...itemRowFromInput(input, d, {
          dealerAccountId: ctx.dealerAccount.id,
          shipmentId: existing.shipmentId!,
          handling: input.clientHandlingFee,
        }),
        shipment_id: existing.shipmentId,
        egun_listing_url: input.egunListingUrl ?? existing.egunListingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('dealer_account_id', ctx.dealerAccount.id)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_UPDATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: id,
    })
    if (existing.shipmentId)
      revalidatePath(`${BASE}/shipments/${existing.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    const warn = [...d.blockers, ...d.warnings]
    return {
      ok: true,
      message: warn.length ? `Saved — check: ${warn.join(' · ')}` : 'Saved',
    }
  })
}

export async function deleteItem(id: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const existing = await getItem(ctx.dealerAccount.id, id)
    if (!existing) throw new ActionError('Item not found')
    if (existing.status === 'TRANSFERRED') {
      throw new ActionError(
        'Transferred items are a permanent legal record and cannot be deleted.'
      )
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('dealer_account_id', ctx.dealerAccount.id)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_DELETED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: id,
      details: {
        make: existing.make,
        model: existing.model,
        serialNumber: existing.serialNumber,
      },
    })
    if (existing.shipmentId)
      revalidatePath(`${BASE}/shipments/${existing.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    revalidatePath(`${BASE}/bin`)
    return { ok: true, message: 'Moved to the bin' }
  })
}

export async function restoreItem(id: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const supabase = await createClient()
    const { data: item, error: fetchError } = await supabase
      .from('armory_inventory_items')
      .select('shipment_id, deleted_at')
      .eq('id', id)
      .eq('dealer_account_id', ctx.dealerAccount.id)
      .maybeSingle()

    if (fetchError) throw new ActionError(fetchError.message)
    if (!item) throw new ActionError('Item not found')
    if (!item.deleted_at) throw new ActionError('Item is not in the bin')

    const { error } = await supabase
      .from('armory_inventory_items')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_RESTORED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: id,
    })
    if (item.shipment_id)
      revalidatePath(`${BASE}/shipments/${item.shipment_id}`)
    revalidatePath(`${BASE}/inventory`)
    revalidatePath(`${BASE}/bin`)
    return { ok: true, message: 'Restored' }
  })
}

export async function purgeOldTrash(dealerAccountId: string): Promise<number> {
  const supabase = await createClient()
  const cutoff = new Date(
    Date.now() - TRASH_RETENTION_DAYS * 86_400_000
  ).toISOString()
  const { data: rows, error } = await supabase
    .from('armory_inventory_items')
    .select('id')
    .eq('dealer_account_id', dealerAccountId)
    .not('deleted_at', 'is', null)
    .lte('deleted_at', cutoff)

  if (error || !rows?.length) return 0

  let purged = 0
  for (const { id } of rows) {
    const { count } = await supabase
      .from('armory_generated_documents')
      .select('*', { count: 'exact', head: true })
      .eq('inventory_item_id', id)

    if ((count ?? 0) > 0) continue
    await supabase
      .from('armory_ownership_events')
      .delete()
      .eq('inventory_item_id', id)
    await supabase.from('armory_inventory_items').delete().eq('id', id)
    purged++
  }
  return purged
}

export async function assignBuyer(
  itemId: string,
  buyerId: string | null,
  fd?: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item) throw new ActionError('Item not found')
    if (item.status === 'TRANSFERRED')
      throw new ActionError('Item already transferred')
    const account = (await getDealerAccount(ctx.dealerAccount.id))!
    const supabase = await createClient()

    if (buyerId) {
      const { data: buyer, error: buyerError } = await supabase
        .from('armory_buyers')
        .select('*')
        .eq('id', buyerId)
        .eq('dealer_account_id', ctx.dealerAccount.id)
        .maybeSingle()

      if (buyerError || !buyer) throw new ActionError('Buyer not found')
      if (buyer.anonymised_at)
        throw new ActionError('That buyer record has been anonymised')

      const salePrice = fd ? num(fd, 'salePrice') : null
      const fee = fd ? num(fd, 'clientHandlingFee') : null

      const { error } = await supabase
        .from('armory_inventory_items')
        .update({
          current_holder_type: 'BUYER',
          current_holder_buyer_id: buyerId,
          status: item.status === 'AVAILABLE' ? 'RESERVED' : item.status,
          sale_price: salePrice ?? item.salePrice,
          client_handling_fee: fee ?? item.clientHandlingFee,
          buyer_licence_type: item.buyerLicenceType ?? buyer.licence_type,
          buyer_licence_number: item.buyerLicenceNumber ?? buyer.licence_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)

      if (error) throw new ActionError(error.message)

      await supabase.from('armory_ownership_events').insert({
        inventory_item_id: itemId,
        event_type: 'DOMESTIC_SALE',
        from_label: `${account.companyName} (dealer stock)`,
        to_label: `${buyer.first_names} ${buyer.surname}`,
        buyer_id: buyerId,
        event_date: new Date().toISOString().slice(0, 10),
      })
    } else {
      if (item.status === 'PENDING_TRANSFER')
        throw new ActionError('Cancel the pending transfer first')
      const { error } = await supabase
        .from('armory_inventory_items')
        .update({
          current_holder_type: 'DEALER_STOCK',
          current_holder_buyer_id: null,
          status: 'AVAILABLE',
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)

      if (error) throw new ActionError(error.message)

      await supabase.from('armory_ownership_events').insert({
        inventory_item_id: itemId,
        event_type: 'DOMESTIC_SALE',
        from_label: item.buyerName ?? 'Buyer',
        to_label: `${account.companyName} (dealer stock) — sale cancelled`,
        event_date: new Date().toISOString().slice(0, 10),
      })
    }

    await audit('ITEM_UPDATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: itemId,
      details: { assignBuyer: buyerId },
    })
    if (item.shipmentId) revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    revalidatePath(`${BASE}/buyers`)
    return { ok: true, message: 'Buyer updated' }
  })
}

export async function setPayment(
  itemId: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item) throw new ActionError('Item not found')
    const amountPaid = num(fd, 'amountPaid') ?? 0
    const due = (item.salePrice ?? 0) + (item.clientHandlingFee ?? 0)
    const status =
      amountPaid <= 0
        ? 'UNPAID'
        : amountPaid >= due && due > 0
          ? 'PAID'
          : 'PARTIAL'

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        amount_paid: amountPaid,
        payment_status: status,
        date_paid: str(fd, 'datePaid'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (error) throw new ActionError(error.message)
    if (item.shipmentId) revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    revalidatePath(`${BASE}/accounting`)
    return { ok: true, message: 'Payment saved' }
  })
}

export async function markPendingTransferManual(
  itemId: string
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item) throw new ActionError('Item not found')
    if (item.itemType !== 'FIREARM')
      throw new ActionError('Only firearms need a transfer proforma')

    const supabase = await createClient()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        status: 'PENDING_TRANSFER',
        transfer_doc_printed_at: item.transferDocPrintedAt ?? now,
        updated_at: now,
      })
      .eq('id', itemId)

    if (error) throw new ActionError(error.message)

    await supabase.from('armory_generated_documents').insert({
      dealer_account_id: ctx.dealerAccount.id,
      shipment_id: item.shipmentId,
      inventory_item_id: itemId,
      doc_type: 'TRANSFER_PROFORMA',
      generation_method: 'BLANK_MANUAL',
      version: 1,
      data_snapshot: {},
      created_by: ctx.userId,
    })

    await audit('ITEM_TRANSFER_PENDING', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: itemId,
      details: { method: 'BLANK_MANUAL' },
    })
    if (item.shipmentId) revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    return { ok: true, message: 'Marked pending transfer' }
  })
}

export async function markTransferred(
  itemId: string,
  fd?: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item) throw new ActionError('Item not found')
    if (!item.currentHolderBuyerId)
      throw new ActionError('Assign a buyer before marking as transferred')
    const date =
      (fd && str(fd, 'transferredAt')) || new Date().toISOString().slice(0, 10)

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        status: 'TRANSFERRED',
        transferred_at: date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_TRANSFERRED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: itemId,
      details: { transferredAt: date },
    })
    if (item.shipmentId) revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    revalidatePath(BASE)
    return {
      ok: true,
      message:
        'Marked as transferred. Reminder: the Commissioner must be informed within 15 days (Arms Act art. 20).',
    }
  })
}

export async function cancelPendingTransfer(
  itemId: string
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item || item.status !== 'PENDING_TRANSFER')
      throw new ActionError('Item is not pending transfer')

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({ status: 'RESERVED', updated_at: new Date().toISOString() })
      .eq('id', itemId)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_UPDATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: itemId,
      details: { cancelPendingTransfer: true },
    })
    if (item.shipmentId) revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    return { ok: true, message: 'Pending transfer cancelled' }
  })
}

export async function markCommissionerNotified(
  itemId: string
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item) throw new ActionError('Item not found')

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        commissioner_notified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_COMMISSIONER_NOTIFIED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: itemId,
    })
    revalidatePath(BASE, 'layout')
    return { ok: true, message: 'Commissioner notification recorded' }
  })
}

export async function markCollected(itemId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item) throw new ActionError('Item not found')

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        collected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_COLLECTED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: itemId,
    })
    if (item.shipmentId) revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    return { ok: true, message: 'Marked collected' }
  })
}

export async function setOnHold(
  itemId: string,
  reason: string
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item) throw new ActionError('Item not found')
    if (item.status === 'TRANSFERRED')
      throw new ActionError('Transferred items are locked')
    if (!reason.trim()) throw new ActionError('Add a short reason for the hold')

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        on_hold: true,
        on_hold_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_ON_HOLD', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: itemId,
      details: { reason },
    })
    if (item.shipmentId) revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    return { ok: true, message: 'Item on hold' }
  })
}

export async function clearOnHold(itemId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const item = await getItem(ctx.dealerAccount.id, itemId)
    if (!item) throw new ActionError('Item not found')

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_inventory_items')
      .update({
        on_hold: false,
        on_hold_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (error) throw new ActionError(error.message)

    await audit('ITEM_UPDATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'inventory_item',
      entityId: itemId,
      details: { clearOnHold: true },
    })
    if (item.shipmentId) revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    revalidatePath(`${BASE}/inventory`)
    return { ok: true, message: 'Hold cleared' }
  })
}
