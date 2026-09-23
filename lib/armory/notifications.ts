import { createClient } from '@/lib/supabase/server'

export type Trigger = 'PERMIT_APPLIED' | 'SHIPPED' | 'READY_FOR_COLLECTION'

export const TRIGGER_LABEL: Record<Trigger, string> = {
  PERMIT_APPLIED: 'Import permit applied for',
  SHIPPED: 'Shipment left the origin country',
  READY_FOR_COLLECTION: 'Items ready for collection',
}

export const TRIGGER_FOR_STATUS: Partial<
  Record<'PERMIT_APPLIED' | 'SHIPPED' | 'READY_FOR_COLLECTION', Trigger>
> = {
  PERMIT_APPLIED: 'PERMIT_APPLIED',
  SHIPPED: 'SHIPPED',
  READY_FOR_COLLECTION: 'READY_FOR_COLLECTION',
}

export function renderTemplate(
  trigger: Trigger,
  vars: {
    dealer: string
    buyer: string
    items: string
    reference: string
  }
): string {
  switch (trigger) {
    case 'PERMIT_APPLIED':
      return `${vars.dealer}: Hi ${vars.buyer}, the import permit for your item(s) (${vars.items}) in shipment ${vars.reference} has been applied for with the Malta Police. We'll update you when the box ships.`
    case 'SHIPPED':
      return `${vars.dealer}: Hi ${vars.buyer}, shipment ${vars.reference} containing your item(s) (${vars.items}) has left the origin country and is on its way to Malta.`
    case 'READY_FOR_COLLECTION':
      return `${vars.dealer}: Hi ${vars.buyer}, your item(s) (${vars.items}) from shipment ${vars.reference} are ready. Please get in touch to arrange the transfer at the Weapons Office and collection.`
  }
}

type Channel = 'WHATSAPP' | 'SMS'

function providerConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
}

async function sendViaTwilio(
  channel: Channel,
  to: string,
  body: string
): Promise<{ sid: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const from =
    channel === 'WHATSAPP'
      ? process.env.TWILIO_WHATSAPP_FROM
      : process.env.TWILIO_SMS_FROM
  if (!from) throw new Error(`TWILIO_${channel}_FROM is not set`)
  const toAddr = channel === 'WHATSAPP' ? `whatsapp:${to}` : to
  const fromAddr =
    channel === 'WHATSAPP'
      ? from.startsWith('whatsapp:')
        ? from
        : `whatsapp:${from}`
      : from
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toAddr, From: fromAddr, Body: body }),
    }
  )
  const json = (await res.json()) as { sid?: string; message?: string }
  if (!res.ok || !json.sid)
    throw new Error(json.message ?? `Twilio error ${res.status}`)
  return { sid: json.sid }
}

export type NotifyResult = {
  buyerId: string
  buyer: string
  channel: Channel | null
  status: string
  error?: string
}

export async function notifyShipmentBuyers(opts: {
  dealerAccountId: string
  dealerName: string
  shipmentId: string
  reference: string
  trigger: Trigger
}): Promise<NotifyResult[]> {
  const supabase = await createClient()
  const { data: items, error: itemsError } = await supabase
    .from('armory_inventory_items')
    .select(
      'current_holder_buyer_id, make, model, buyer:armory_buyers!armory_inventory_items_current_holder_buyer_id_fkey(id, first_names, surname, phone_number, whatsapp_opt_in, sms_opt_in, anonymised_at)'
    )
    .eq('shipment_id', opts.shipmentId)
    .eq('dealer_account_id', opts.dealerAccountId)
    .not('current_holder_buyer_id', 'is', null)

  if (itemsError) throw itemsError

  type BuyerSlice = {
    id: string
    first_names: string
    surname: string
    phone_number: string | null
    whatsapp_opt_in: boolean
    sms_opt_in: boolean
    anonymised_at: string | null
  }

  const byBuyer = new Map<string, { buyer: BuyerSlice; labels: string[] }>()

  for (const row of items ?? []) {
    const buyer = row.buyer as unknown as BuyerSlice | null
    if (!buyer?.id || buyer.anonymised_at) continue
    const label = [row.make, row.model].filter(Boolean).join(' ').trim()
    const existing = byBuyer.get(buyer.id)
    if (existing) {
      if (label) existing.labels.push(label)
    } else {
      byBuyer.set(buyer.id, { buyer, labels: label ? [label] : [] })
    }
  }

  const results: NotifyResult[] = []
  const now = new Date().toISOString()

  for (const { buyer, labels } of Array.from(byBuyer.values())) {
    const name = `${buyer.first_names} ${buyer.surname}`.trim()
    const channel: Channel | null = buyer.whatsapp_opt_in
      ? 'WHATSAPP'
      : buyer.sms_opt_in
        ? 'SMS'
        : null

    if (!channel || !buyer.phone_number) {
      results.push({
        buyerId: buyer.id,
        buyer: name,
        channel: null,
        status: 'SKIPPED_NO_OPT_IN',
      })
      continue
    }

    const body = renderTemplate(opts.trigger, {
      dealer: opts.dealerName,
      buyer: buyer.first_names,
      items: labels.join(', '),
      reference: opts.reference,
    })

    let status = 'LOGGED'
    let providerRef: string | null = null
    let error: string | null = null
    let sentAt: string | null = now

    if (providerConfigured()) {
      try {
        const r = await sendViaTwilio(channel, buyer.phone_number, body)
        providerRef = r.sid
        status = 'SENT'
      } catch (e) {
        status = 'FAILED'
        error = e instanceof Error ? e.message : String(e)
        sentAt = null
      }
    }

    const { error: insertError } = await supabase
      .from('armory_notification_events')
      .insert({
        dealer_account_id: opts.dealerAccountId,
        buyer_id: buyer.id,
        shipment_id: opts.shipmentId,
        trigger_type: opts.trigger,
        channel,
        message_content: body,
        delivery_status: status,
        sent_at: status === 'SENT' || status === 'LOGGED' ? sentAt : null,
        provider_ref: providerRef,
        error,
      })

    if (insertError) throw insertError

    results.push({
      buyerId: buyer.id,
      buyer: name,
      channel,
      status,
      error: error ?? undefined,
    })
  }

  return results
}

export function notificationsConfigured() {
  return providerConfigured()
}
