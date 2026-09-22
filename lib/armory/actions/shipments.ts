'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { audit } from '@/lib/armory/audit'
import { getShipment, SHIPMENT_STATUSES } from '@/lib/armory/queries'
import type { ShipmentStatus } from '@/lib/armory/types'
import { ActionError, run, str, num, type ActionResult } from './action-utils'
import { dealerCtx } from './_helpers'

const BASE = '/profile/armory'

export async function createShipment(fd: FormData): Promise<ActionResult> {
  const ctx = await dealerCtx()
  const reference = str(fd, 'reference')
  if (!reference) return { ok: false, error: 'Reference is required' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_shipments')
    .insert({
      dealer_account_id: ctx.dealerAccount.id,
      reference,
      status: 'PRE_ORDER',
      sender_type: 'COMPANY',
    })
    .select('id')
    .single()

  if (error || !data)
    return { ok: false, error: error?.message ?? 'Failed to create shipment' }

  await audit('SHIPMENT_CREATED', {
    userId: ctx.userId,
    dealerAccountId: ctx.dealerAccount.id,
    entityType: 'shipment',
    entityId: data.id,
    details: { reference },
  })
  redirect(`${BASE}/shipments/${data.id}`)
}

export async function updateShipment(
  id: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    if (!(await getShipment(ctx.dealerAccount.id, id)))
      throw new ActionError('Shipment not found')

    const fieldMap: Record<string, string> = {
      reference: 'reference',
      senderType: 'sender_type',
      senderSurname: 'sender_surname',
      senderFirstNames: 'sender_first_names',
      senderDateOfBirth: 'sender_date_of_birth',
      senderPlaceOfBirth: 'sender_place_of_birth',
      senderPassportId: 'sender_passport_id',
      senderIssueDate: 'sender_issue_date',
      senderIssuingAuthority: 'sender_issuing_authority',
      senderCompanyName: 'sender_company_name',
      senderRegisteredOffice: 'sender_registered_office',
      senderAddress: 'sender_address',
      senderCountry: 'sender_country',
      senderPhone: 'sender_phone',
      senderFax: 'sender_fax',
      priorConsentRef: 'prior_consent_ref',
      priorConsentDate: 'prior_consent_date',
      exportAuthorisationRef: 'export_authorisation_ref',
      exportAuthorisationDate: 'export_authorisation_date',
      carrier: 'carrier',
      transitCountries: 'transit_countries',
      deliveryAddress: 'delivery_address',
      notes: 'notes',
    }

    const update: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    }
    const present: string[] = []
    for (const [formKey, dbKey] of Object.entries(fieldMap)) {
      if (fd.has(formKey)) {
        present.push(formKey)
        update[dbKey] =
          formKey === 'reference' ? (str(fd, formKey) ?? '') : str(fd, formKey)
      }
    }
    if (present.length === 0) return { ok: true }

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_shipments')
      .update(update)
      .eq('id', id)
      .eq('dealer_account_id', ctx.dealerAccount.id)

    if (error) throw new ActionError(error.message)

    await audit('SHIPMENT_UPDATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'shipment',
      entityId: id,
      details: { fields: present },
    })
    revalidatePath(`${BASE}/shipments/${id}`)
    return { ok: true, message: 'Shipment saved' }
  })
}

export async function setShipmentStatus(
  id: string,
  status: string,
  opts?: { notify?: boolean; reason?: string }
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const sh = await getShipment(ctx.dealerAccount.id, id)
    if (!sh) throw new ActionError('Shipment not found')
    if (!SHIPMENT_STATUSES.some(x => x.value === status))
      throw new ActionError('Invalid status')
    const st = status as ShipmentStatus

    const stamp: Partial<Record<ShipmentStatus, string>> = {
      PERMIT_APPLIED: 'permit_applied_at',
      SHIPPED: 'shipped_at',
      ARRIVED: 'arrived_at',
      READY_FOR_COLLECTION: 'ready_at',
    }
    const col = stamp[st]
    const now = new Date().toISOString()

    const update: Record<string, unknown> = {
      status: st,
      updated_at: now,
      permit_rejected_reason:
        st === 'PERMIT_REJECTED'
          ? (opts?.reason ?? null)
          : sh.permitRejectedReason,
    }
    if (col) update[col] = now

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_shipments')
      .update(update)
      .eq('id', id)
      .eq('dealer_account_id', ctx.dealerAccount.id)

    if (error) throw new ActionError(error.message)

    if (st === 'PERMIT_REJECTED') {
      await supabase
        .from('armory_inventory_items')
        .update({ status: 'REJECTED', updated_at: now })
        .eq('shipment_id', id)
        .in('status', ['AVAILABLE', 'RESERVED'])
    }

    await audit('SHIPMENT_STATUS', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'shipment',
      entityId: id,
      details: { from: sh.status, to: st, reason: opts?.reason },
    })

    let message = `Status set to ${SHIPMENT_STATUSES.find(x => x.value === st)?.label}`
    if (
      ['PERMIT_APPLIED', 'SHIPPED', 'READY_FOR_COLLECTION'].includes(st) &&
      opts?.notify !== false
    ) {
      message += ' · buyer notifications are not configured yet'
    }

    revalidatePath(`${BASE}/shipments/${id}`)
    revalidatePath(BASE)
    return { ok: true, message }
  })
}

export async function addQuote(
  shipmentId: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    if (!(await getShipment(ctx.dealerAccount.id, shipmentId)))
      throw new ActionError('Shipment not found')
    const carrier = str(fd, 'carrierName')
    const amount = num(fd, 'quotedAmount')
    if (!carrier || amount === null)
      throw new ActionError('Carrier and amount are required')

    const supabase = await createClient()
    const { error } = await supabase.from('armory_shipping_quotes').insert({
      shipment_id: shipmentId,
      carrier_name: carrier,
      quoted_amount: amount,
      quote_date: str(fd, 'quoteDate'),
      status: 'RECEIVED',
      source: 'MANUAL',
      notes: str(fd, 'notes'),
    })
    if (error) throw new ActionError(error.message)
    revalidatePath(`${BASE}/shipments/${shipmentId}`)
    return { ok: true, message: 'Quote added' }
  })
}

export async function setQuoteStatus(
  shipmentId: string,
  quoteId: string,
  status: 'RECEIVED' | 'ACCEPTED' | 'DECLINED'
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    if (!(await getShipment(ctx.dealerAccount.id, shipmentId)))
      throw new ActionError('Shipment not found')

    const supabase = await createClient()
    if (status === 'ACCEPTED') {
      await supabase
        .from('armory_shipping_quotes')
        .update({ status: 'DECLINED' })
        .eq('shipment_id', shipmentId)
        .eq('status', 'ACCEPTED')

      const { data: q } = await supabase
        .from('armory_shipping_quotes')
        .select('carrier_name, quoted_amount')
        .eq('id', quoteId)
        .eq('shipment_id', shipmentId)
        .maybeSingle()

      if (q) {
        const noteTag = `quote:${quoteId}`
        const { data: exists } = await supabase
          .from('armory_shipment_costs')
          .select('id')
          .eq('shipment_id', shipmentId)
          .eq('notes', noteTag)
          .maybeSingle()

        if (!exists) {
          await supabase.from('armory_shipment_costs').insert({
            shipment_id: shipmentId,
            label: `Shipping — ${q.carrier_name}`,
            amount: q.quoted_amount,
            cost_date: new Date().toISOString().slice(0, 10),
            notes: noteTag,
          })
        }
      }
    }

    const { error } = await supabase
      .from('armory_shipping_quotes')
      .update({ status })
      .eq('id', quoteId)
      .eq('shipment_id', shipmentId)

    if (error) throw new ActionError(error.message)
    revalidatePath(`${BASE}/shipments/${shipmentId}`)
    return { ok: true, message: 'Quote updated' }
  })
}

export async function deleteQuote(
  shipmentId: string,
  quoteId: string
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    if (!(await getShipment(ctx.dealerAccount.id, shipmentId)))
      throw new ActionError('Shipment not found')
    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_shipping_quotes')
      .delete()
      .eq('id', quoteId)
      .eq('shipment_id', shipmentId)
    if (error) throw new ActionError(error.message)
    revalidatePath(`${BASE}/shipments/${shipmentId}`)
    return { ok: true, message: 'Quote deleted' }
  })
}

export async function addCost(
  shipmentId: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    if (!(await getShipment(ctx.dealerAccount.id, shipmentId)))
      throw new ActionError('Shipment not found')
    const label = str(fd, 'label')
    const amount = num(fd, 'amount')
    if (!label || amount === null)
      throw new ActionError('Description and amount are required')

    const supabase = await createClient()
    const { error } = await supabase.from('armory_shipment_costs').insert({
      shipment_id: shipmentId,
      label,
      amount,
      cost_date: str(fd, 'date'),
      notes: str(fd, 'notes'),
    })
    if (error) throw new ActionError(error.message)
    revalidatePath(`${BASE}/shipments/${shipmentId}`)
    revalidatePath(`${BASE}/accounting`)
    return { ok: true, message: 'Cost added' }
  })
}

export async function deleteCost(
  shipmentId: string,
  costId: string
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    if (!(await getShipment(ctx.dealerAccount.id, shipmentId)))
      throw new ActionError('Shipment not found')
    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_shipment_costs')
      .delete()
      .eq('id', costId)
      .eq('shipment_id', shipmentId)
    if (error) throw new ActionError(error.message)
    revalidatePath(`${BASE}/shipments/${shipmentId}`)
    revalidatePath(`${BASE}/accounting`)
    return { ok: true, message: 'Cost deleted' }
  })
}

export async function deleteShipment(id: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const supabase = await createClient()
    const { count, error: countError } = await supabase
      .from('armory_inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('shipment_id', id)

    if (countError) throw new ActionError(countError.message)
    if ((count ?? 0) > 0) {
      throw new ActionError(
        'Remove the items first — shipments with items cannot be deleted (audit trail)'
      )
    }

    await supabase.from('armory_shipping_quotes').delete().eq('shipment_id', id)
    await supabase.from('armory_shipment_costs').delete().eq('shipment_id', id)
    const { error } = await supabase
      .from('armory_shipments')
      .delete()
      .eq('id', id)
      .eq('dealer_account_id', ctx.dealerAccount.id)
    if (error) throw new ActionError(error.message)

    revalidatePath(BASE)
    redirect(BASE)
  })
}
