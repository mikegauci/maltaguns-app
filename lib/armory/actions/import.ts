'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { audit } from '@/lib/armory/audit'
import {
  classify,
  defaultHandlingFee,
  type ItemType,
} from '@/lib/armory/classification'
import { getShipment, listBuyers } from '@/lib/armory/queries'
import {
  parseWorkbook,
  guessMapping,
  normaliseHeader,
  toNumber,
  guessItemType,
  guessCategory,
  guessFireMode,
  parseCip,
} from '@/lib/armory/import'
import {
  aiConfigured,
  classifyRowTypes,
  type RowTypeGuess,
} from '@/lib/armory/ai'
import { ActionError, run, str, type ActionResult } from './action-utils'
import { dealerCtx } from './_helpers'

const BASE = '/profile/armory'
const TYPE_GUESSES_KEY = '__typeGuesses'

function parseTypeGuesses(
  mapping: Record<string, unknown>
): Record<number, RowTypeGuess> {
  const raw = mapping[TYPE_GUESSES_KEY]
  if (!raw || typeof raw !== 'object') return {}
  return raw as Record<number, RowTypeGuess>
}

function stripMetaKeys(mapping: Record<string, unknown>) {
  const out: Record<number, string> = {}
  for (const [k, v] of Object.entries(mapping)) {
    if (k === TYPE_GUESSES_KEY) continue
    out[Number(k)] = String(v)
  }
  return out
}

export async function uploadImport(fd: FormData): Promise<ActionResult> {
  const s = await dealerCtx()
  const file = fd.get('file')
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: 'Choose an .xlsx, .xls, or .csv file' }
  if (file.size > 15 * 1024 * 1024)
    return { ok: false, error: 'File is larger than 15 MB' }
  const buf = Buffer.from(await file.arrayBuffer())
  let sheets
  try {
    sheets = await parseWorkbook(buf, file.name)
  } catch (e) {
    return {
      ok: false,
      error: `Could not read the file: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
  if (sheets.length === 0) return { ok: false, error: 'No rows found' }

  const supabase = await createClient()
  const { data: account } = await supabase
    .from('armory_dealer_accounts')
    .select('import_column_mapping')
    .eq('id', s.dealerAccount.id)
    .single()

  const remembered: Record<string, string> =
    account?.import_column_mapping &&
    typeof account.import_column_mapping === 'object'
      ? (account.import_column_mapping as Record<string, string>)
      : {}

  const ids: string[] = []
  for (const sh of sheets) {
    if (sh.rows.length === 0) continue
    const { data, error } = await supabase
      .from('armory_import_batches')
      .insert({
        dealer_account_id: s.dealerAccount.id,
        file_name: file.name,
        sheet_name: sh.sheetName,
        headers: sh.headers,
        rows: sh.rows,
        mapping: guessMapping(sh.headers, remembered),
        status: 'PENDING',
      })
      .select('id')
      .single()
    if (error || !data)
      return { ok: false, error: error?.message ?? 'Failed to save import' }
    ids.push(data.id)
  }
  if (ids.length === 0) return { ok: false, error: 'The file has no data rows' }
  redirect(`${BASE}/import/${ids[0]}`)
}

export async function confirmImport(
  batchId: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const s = await dealerCtx()
    const supabase = await createClient()
    const { data: batch, error } = await supabase
      .from('armory_import_batches')
      .select('*')
      .eq('id', batchId)
      .eq('dealer_account_id', s.dealerAccount.id)
      .eq('status', 'PENDING')
      .single()

    if (error || !batch)
      throw new ActionError('Import batch not found or already processed')

    const headers = batch.headers as string[]
    const rows = batch.rows as string[][]
    const storedMapping = (batch.mapping ?? {}) as Record<string, unknown>
    const typeGuesses = parseTypeGuesses(storedMapping)
    const mapping: Record<number, string> = {}
    headers.forEach((_, i) => {
      const t = str(fd, `map_${i}`)
      if (t) mapping[i] = t
    })
    const selected = new Set(fd.getAll('row').map(String))
    if (selected.size === 0)
      throw new ActionError(
        'No rows selected — tick at least one row, or use Select all.'
      )
    if (
      !Object.values(mapping).some(
        v => v === 'make' || v === 'model' || v === 'serialNumber'
      )
    )
      throw new ActionError(
        'Map at least the Make, Model or Serial number column'
      )

    let shipmentId = str(fd, 'shipmentId')
    const newRef = str(fd, 'newShipmentReference')
    if (newRef) {
      const { data: sh, error: shErr } = await supabase
        .from('armory_shipments')
        .insert({
          dealer_account_id: s.dealerAccount.id,
          reference: newRef,
          status: 'PRE_ORDER',
          sender_type: 'COMPANY',
        })
        .select('id')
        .single()
      if (shErr || !sh)
        throw new ActionError(shErr?.message ?? 'Failed to create shipment')
      shipmentId = sh.id
    }
    if (!shipmentId || !(await getShipment(s.dealerAccount.id, shipmentId)))
      throw new ActionError(
        'Choose a shipment or give a reference for a new one'
      )

    const buyers = await listBuyers(s.dealerAccount.id)
    const { data: account } = await supabase
      .from('armory_dealer_accounts')
      .select('*')
      .eq('id', s.dealerAccount.id)
      .single()

    const remembered: Record<string, string> = {}
    headers.forEach((h, i) => {
      if (mapping[i]) remembered[normaliseHeader(h)] = mapping[i]
    })

    let created = 0
    let skipped = 0
    for (let idx = 0; idx < rows.length; idx++) {
      if (!selected.has(String(idx))) continue
      const row = rows[idx]
      const rec: Record<string, string> = {}
      for (const [col, target] of Object.entries(mapping))
        rec[target] = row[Number(col)] ?? ''
      if (!rec.make && !rec.model && !rec.serialNumber && !rec.descriptionRaw) {
        skipped++
        continue
      }
      const override = str(fd, `type_${idx}`)
      const itemType = (
        override === 'FIREARM' ||
        override === 'REGULATED_COMPONENT' ||
        override === 'ACCESSORY'
          ? override
          : (typeGuesses[idx]?.itemType ?? guessItemType(rec))
      ) as ItemType
      const category = itemType === 'FIREARM' ? guessCategory(rec) : null
      const fireMode =
        itemType === 'FIREARM' ? guessFireMode(rec) : 'NOT_APPLICABLE'
      const c = classify({
        itemType,
        category,
        fireMode,
        yearOfManufacture: rec.yearOfManufacture,
        calibreRaw: rec.calibreRaw,
        serialNumber: rec.serialNumber,
        make: rec.make,
        model: rec.model,
        typeDescription: rec.descriptionRaw,
      })
      const buyerInitials = rec.buyerInitials
      let buyerId: string | null = null
      if (buyerInitials) {
        const match = buyers.find(
          b =>
            `${b.firstNames} ${b.surname}`
              .toLowerCase()
              .includes(buyerInitials.toLowerCase()) ||
            buyerInitials.toLowerCase().includes(b.surname.toLowerCase())
        )
        buyerId = match?.id ?? null
      }
      const handling =
        toNumber(rec.clientHandlingFee) ??
        (itemType === 'FIREARM'
          ? defaultHandlingFee(
              category,
              account?.default_handling_fee_rifle as number | null,
              account?.default_handling_fee_pistol as number | null
            )
          : null)

      const { error: insErr } = await supabase
        .from('armory_inventory_items')
        .insert({
          dealer_account_id: s.dealerAccount.id,
          shipment_id: shipmentId,
          import_batch_id: batchId,
          item_type: itemType,
          category,
          make: rec.make || null,
          model: rec.model || null,
          quantity: Math.max(1, Math.round(toNumber(rec.quantity) ?? 1)),
          serial_number: rec.serialNumber || null,
          calibre_raw: rec.calibreRaw || null,
          calibre_display: c.calibre.display || null,
          gauge: c.calibre.gauge,
          country_of_manufacture: rec.countryOfManufacture || null,
          year_of_manufacture: rec.yearOfManufacture || null,
          fire_mode: fireMode,
          cip_proof: parseCip(rec.cipProof),
          schedule_proforma: c.scheduleProforma,
          schedule_import_doc: c.scheduleImportDoc,
          eu_category: c.euCategory,
          acquisition_price: toNumber(rec.acquisitionPrice),
          egun_domestic_shipping_fee: toNumber(rec.egunDomesticShippingFee),
          sale_price: toNumber(rec.salePrice),
          client_handling_fee: handling,
          original_seller: rec.originalSeller || null,
          description_raw: rec.descriptionRaw || null,
          egun_listing_id: rec.egunListingId || null,
          current_holder_buyer_id: buyerId,
          current_holder_type: buyerId ? 'BUYER' : 'DEALER_STOCK',
          status: buyerId ? 'RESERVED' : 'AVAILABLE',
        })
      if (insErr) throw new ActionError(insErr.message)
      created++
    }

    await supabase
      .from('armory_import_batches')
      .update({
        status: 'COMPLETED',
        mapping: { ...mapping, [TYPE_GUESSES_KEY]: typeGuesses },
      })
      .eq('id', batchId)

    if (Object.keys(remembered).length) {
      await supabase
        .from('armory_dealer_accounts')
        .update({ import_column_mapping: remembered })
        .eq('id', s.dealerAccount.id)
    }

    await audit('IMPORT_COMPLETED', {
      userId: s.userId,
      dealerAccountId: s.dealerAccount.id,
      entityType: 'import_batch',
      entityId: batchId,
      details: { created, shipmentId },
    })
    revalidatePath(`${BASE}/inventory`)
    revalidatePath(`${BASE}/shipments/${shipmentId}`)
    redirect(
      `${BASE}/shipments/${shipmentId}?imported=${created}&skipped=${skipped}`
    )
  })
}

export async function suggestRowTypes(batchId: string): Promise<ActionResult> {
  return run(async () => {
    const s = await dealerCtx()
    if (!aiConfigured())
      throw new ActionError(
        'AI suggestions need ANTHROPIC_API_KEY set in .env — without it, rows fall back to the keyword-based guess.'
      )
    const supabase = await createClient()
    const { data: batch, error } = await supabase
      .from('armory_import_batches')
      .select('id, headers, rows, mapping')
      .eq('id', batchId)
      .eq('dealer_account_id', s.dealerAccount.id)
      .eq('status', 'PENDING')
      .single()
    if (error || !batch)
      throw new ActionError('Import batch not found or already processed')
    const headers = batch.headers as string[]
    const rows = batch.rows as string[][]
    const items = rows.map((r, idx) => ({
      idx,
      text: headers
        .map((h, i) => (r[i] ? `${h}: ${r[i]}` : null))
        .filter(Boolean)
        .join(' | '),
    }))
    const { guesses, failedRows } = await classifyRowTypes(items)
    if (Object.keys(guesses).length === 0)
      throw new ActionError(
        "The AI didn't return usable suggestions — rows will fall back to the keyword-based guess."
      )
    const mapping = stripMetaKeys(
      (batch.mapping ?? {}) as Record<string, unknown>
    )
    await supabase
      .from('armory_import_batches')
      .update({
        mapping: { ...mapping, [TYPE_GUESSES_KEY]: guesses },
      })
      .eq('id', batchId)
    const low = Object.values(guesses).filter(
      g => g.confidence === 'low'
    ).length
    revalidatePath(`${BASE}/import/${batchId}`)
    const partial =
      failedRows > 0
        ? ` AI failed on ${failedRows} row(s) — re-run or set those manually.`
        : ''
    return {
      ok: true,
      message: `Suggested a type for ${Object.keys(guesses).length} of ${rows.length} row(s)${low ? ` — ${low} are low-confidence, worth a second look` : ''}.${partial}`,
    }
  })
}

export async function undoImport(batchId: string): Promise<ActionResult> {
  return run(async () => {
    const s = await dealerCtx()
    const supabase = await createClient()
    const { data: batch, error } = await supabase
      .from('armory_import_batches')
      .select('id, file_name, sheet_name, status, undone_at')
      .eq('id', batchId)
      .eq('dealer_account_id', s.dealerAccount.id)
      .single()
    if (error || !batch) throw new ActionError('Import not found')
    if (batch.status !== 'COMPLETED')
      throw new ActionError(
        "This import was never completed, so there's nothing to undo"
      )
    if (batch.undone_at)
      throw new ActionError('This import has already been undone')

    const { data: items, error: itemsErr } = await supabase
      .from('armory_inventory_items')
      .select('id, status, shipment_id')
      .eq('import_batch_id', batchId)
      .eq('dealer_account_id', s.dealerAccount.id)
      .is('deleted_at', null)
    if (itemsErr) throw new ActionError(itemsErr.message)
    if (!items?.length)
      throw new ActionError(
        'Nothing left from this import to undo — the items were already deleted or moved'
      )

    const locked = items.filter(i => i.status === 'TRANSFERRED')
    const toDelete = items.filter(i => i.status !== 'TRANSFERRED')
    const now = new Date().toISOString()
    for (const i of toDelete) {
      await supabase
        .from('armory_inventory_items')
        .update({ deleted_at: now, updated_at: now })
        .eq('id', i.id)
        .eq('dealer_account_id', s.dealerAccount.id)
    }
    await supabase
      .from('armory_import_batches')
      .update({ undone_at: now })
      .eq('id', batchId)

    await audit('IMPORT_UNDONE', {
      userId: s.userId,
      dealerAccountId: s.dealerAccount.id,
      entityType: 'import_batch',
      entityId: batchId,
      details: {
        file: batch.file_name,
        sheet: batch.sheet_name,
        moved: toDelete.length,
        lockedSkipped: locked.length,
      },
    })
    revalidatePath(BASE, 'layout')
    const reserved = toDelete.filter(
      i => i.status === 'RESERVED' || i.status === 'PENDING_TRANSFER'
    ).length
    return {
      ok: true,
      message:
        `Moved ${toDelete.length} item(s) from this import to the Bin (restorable for 30 days).` +
        (reserved
          ? ` ${reserved} were reserved or pending transfer — restore from the Bin if that wasn't intended.`
          : '') +
        (locked.length
          ? ` ${locked.length} item(s) were already transferred and were left as-is — that's a permanent legal record.`
          : ''),
    }
  })
}
