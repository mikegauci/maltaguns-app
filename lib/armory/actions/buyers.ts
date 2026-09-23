'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { audit } from '@/lib/armory/audit'
import { getBuyer } from '@/lib/armory/queries'
import { ActionError, run, str, bool, type ActionResult } from './action-utils'
import { dealerCtx } from './_helpers'

const BASE = '/profile/armory'

function normalisePhone(p: string | null): string | null {
  if (!p) return null
  let d = p.replace(/[^\d+]/g, '')
  if (/^\d{8}$/.test(d)) d = '+356' + d
  if (d.startsWith('00')) d = '+' + d.slice(2)
  return d
}

export async function createBuyer(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const surname = str(fd, 'surname')
    const firstNames = str(fd, 'firstNames')
    if (!surname || !firstNames)
      throw new ActionError('First name(s) and surname are required')
    const phone = normalisePhone(str(fd, 'phoneNumber'))
    const wa = bool(fd, 'whatsappOptIn')
    const sms = bool(fd, 'smsOptIn')
    if ((wa || sms) && !phone)
      throw new ActionError(
        'A phone number is needed for WhatsApp/SMS notifications'
      )
    const licenceType =
      fd.getAll('licenceType').map(String).filter(Boolean).join(',') || null

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('armory_buyers')
      .insert({
        dealer_account_id: ctx.dealerAccount.id,
        surname,
        first_names: firstNames,
        nickname: str(fd, 'nickname'),
        licence_type: licenceType,
        licence_number: str(fd, 'licenceNumber'),
        passport_id_number: str(fd, 'passportIdNumber'),
        phone_number: phone,
        whatsapp_opt_in: wa,
        sms_opt_in: sms,
        email: str(fd, 'email'),
        address: str(fd, 'address'),
        notes: str(fd, 'notes'),
      })
      .select('id')
      .single()

    if (error || !data)
      throw new ActionError(error?.message ?? 'Failed to create buyer')

    await audit('BUYER_CREATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'buyer',
      entityId: data.id,
    })
    revalidatePath(`${BASE}/buyers`)
    revalidatePath(BASE, 'layout')
    return { ok: true, id: data.id, message: 'Buyer added' }
  })
}

export async function updateBuyer(
  id: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const b = await getBuyer(ctx.dealerAccount.id, id)
    if (!b) throw new ActionError('Buyer not found')
    if (b.anonymisedAt)
      throw new ActionError('Anonymised records cannot be edited')
    const surname = str(fd, 'surname')
    const firstNames = str(fd, 'firstNames')
    if (!surname || !firstNames)
      throw new ActionError('First name(s) and surname are required')
    const phone = normalisePhone(str(fd, 'phoneNumber'))
    const licenceType =
      fd.getAll('licenceType').map(String).filter(Boolean).join(',') || null

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_buyers')
      .update({
        surname,
        first_names: firstNames,
        nickname: str(fd, 'nickname'),
        licence_type: licenceType,
        licence_number: str(fd, 'licenceNumber'),
        passport_id_number: str(fd, 'passportIdNumber'),
        phone_number: phone,
        whatsapp_opt_in: bool(fd, 'whatsappOptIn'),
        sms_opt_in: bool(fd, 'smsOptIn'),
        email: str(fd, 'email'),
        address: str(fd, 'address'),
        notes: str(fd, 'notes'),
      })
      .eq('id', id)
      .eq('dealer_account_id', ctx.dealerAccount.id)

    if (error) throw new ActionError(error.message)

    await audit('BUYER_UPDATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'buyer',
      entityId: id,
    })
    revalidatePath(`${BASE}/buyers`)
    revalidatePath(BASE, 'layout')
    return { ok: true, message: 'Buyer saved' }
  })
}

export async function anonymiseBuyer(id: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const b = await getBuyer(ctx.dealerAccount.id, id)
    if (!b) throw new ActionError('Buyer not found')

    const supabase = await createClient()
    const { count, error: countError } = await supabase
      .from('armory_inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('current_holder_buyer_id', id)
      .in('status', ['RESERVED', 'PENDING_TRANSFER'])

    if (countError) throw new ActionError(countError.message)
    if ((count ?? 0) > 0)
      throw new ActionError(
        'This buyer still has items reserved or pending transfer'
      )

    const ref = `Anonymised buyer ${id.slice(0, 8).toUpperCase()}`
    const { error } = await supabase
      .from('armory_buyers')
      .update({
        surname: ref,
        first_names: '',
        nickname: null,
        licence_number: null,
        passport_id_number: null,
        phone_number: null,
        whatsapp_opt_in: false,
        sms_opt_in: false,
        email: null,
        address: null,
        notes: null,
        anonymised_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw new ActionError(error.message)

    await supabase
      .from('armory_notification_events')
      .update({ message_content: '[anonymised]' })
      .eq('buyer_id', id)

    await supabase
      .from('armory_inventory_items')
      .update({ buyer_licence_number: null })
      .eq('current_holder_buyer_id', id)
      .eq('status', 'TRANSFERRED')

    await audit('BUYER_ANONYMISED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'buyer',
      entityId: id,
    })
    revalidatePath(`${BASE}/buyers`)
    revalidatePath(BASE, 'layout')
    return {
      ok: true,
      message:
        'Buyer anonymised. Ownership history retained without personal data.',
    }
  })
}
