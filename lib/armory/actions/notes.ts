'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { audit } from '@/lib/armory/audit'
import { getItem, getShipment } from '@/lib/armory/queries'
import { ActionError, run, str, type ActionResult } from './action-utils'
import { dealerCtx } from './_helpers'

const BASE = '/profile/armory'

type NoteEntity = 'SHIPMENT' | 'ITEM'

export async function addNote(
  entityType: NoteEntity,
  entityId: string,
  fd: FormData
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    if (entityType === 'SHIPMENT') {
      if (!(await getShipment(ctx.dealerAccount.id, entityId)))
        throw new ActionError('Shipment not found')
    } else {
      if (!(await getItem(ctx.dealerAccount.id, entityId)))
        throw new ActionError('Item not found')
    }
    const body = str(fd, 'body')
    if (!body) throw new ActionError("Note can't be empty")

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', ctx.userId)
      .maybeSingle()
    const label = ctx.email || profile?.email || 'Unknown'

    const { error } = await supabase.from('armory_notes').insert({
      dealer_account_id: ctx.dealerAccount.id,
      entity_type: entityType,
      entity_id: entityId,
      body,
      created_by: ctx.userId,
      created_by_label: label,
    })

    if (error) throw new ActionError(error.message)

    await audit('NOTE_ADDED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: entityType === 'SHIPMENT' ? 'shipment' : 'inventory_item',
      entityId,
      details: { note: body },
    })

    if (entityType === 'SHIPMENT')
      revalidatePath(`${BASE}/shipments/${entityId}`)
    else {
      revalidatePath(`${BASE}/inventory/${entityId}`)
      const item = await getItem(ctx.dealerAccount.id, entityId)
      if (item?.shipmentId)
        revalidatePath(`${BASE}/shipments/${item.shipmentId}`)
    }
    return { ok: true, message: 'Note added' }
  })
}

export async function deleteNote(
  entityType: NoteEntity,
  entityId: string,
  noteId: string
): Promise<ActionResult> {
  return run(async () => {
    const ctx = await dealerCtx()
    const supabase = await createClient()
    const { data: note, error: fetchError } = await supabase
      .from('armory_notes')
      .select('created_by')
      .eq('id', noteId)
      .eq('dealer_account_id', ctx.dealerAccount.id)
      .maybeSingle()

    if (fetchError) throw new ActionError(fetchError.message)
    if (!note) throw new ActionError('Note not found')
    if (ctx.staffRole !== 'owner' && note.created_by !== ctx.userId) {
      throw new ActionError(
        "Only the account owner or the note's author can delete it"
      )
    }

    const { error } = await supabase
      .from('armory_notes')
      .delete()
      .eq('id', noteId)
    if (error) throw new ActionError(error.message)

    await audit('NOTE_DELETED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: entityType === 'SHIPMENT' ? 'shipment' : 'inventory_item',
      entityId,
      details: { noteId },
    })

    if (entityType === 'SHIPMENT')
      revalidatePath(`${BASE}/shipments/${entityId}`)
    else revalidatePath(`${BASE}/inventory/${entityId}`)
    return { ok: true, message: 'Note deleted' }
  })
}
