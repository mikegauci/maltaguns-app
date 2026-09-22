import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_PASSWORD_CHANGED'
  | 'USER_CREATED'
  | 'USER_DISABLED'
  | 'USER_PASSWORD_RESET'
  | 'DEALER_APPROVED'
  | 'DEALER_SUSPENDED'
  | 'DEALER_PROFILE_UPDATED'
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_UPDATED'
  | 'SHIPMENT_STATUS'
  | 'ITEM_CREATED'
  | 'ITEM_UPDATED'
  | 'ITEM_DELETED'
  | 'ITEM_RESTORED'
  | 'ITEM_ON_HOLD'
  | 'ITEM_TRANSFER_PENDING'
  | 'ITEM_TRANSFERRED'
  | 'ITEM_COLLECTED'
  | 'ITEM_COMMISSIONER_NOTIFIED'
  | 'ITEM_SCHEDULE_OVERRIDDEN'
  | 'BUYER_CREATED'
  | 'BUYER_UPDATED'
  | 'BUYER_ANONYMISED'
  | 'DOCUMENT_GENERATED'
  | 'NOTIFICATION_SENT'
  | 'IMPORT_COMPLETED'
  | 'IMPORT_UNDONE'
  | 'EGUN_SCRAPED'
  | 'AI_CORRECTION_APPLIED'
  | 'NOTE_ADDED'
  | 'NOTE_DELETED'

export async function clientIp(): Promise<string | null> {
  try {
    const h = await headers()
    return (
      h.get('x-forwarded-for')?.split(',')[0].trim() ??
      h.get('x-real-ip') ??
      null
    )
  } catch {
    return null
  }
}

export async function audit(
  action: AuditAction,
  opts: {
    userId?: string | null
    dealerAccountId?: string | null
    entityType?: string
    entityId?: string
    details?: unknown
    ip?: string | null
  } = {}
) {
  const ip = opts.ip === undefined ? await clientIp() : opts.ip
  const supabase = await createClient()
  await supabase.from('armory_audit_log').insert({
    profile_id: opts.userId ?? null,
    dealer_account_id: opts.dealerAccountId ?? null,
    action,
    entity_type: opts.entityType ?? null,
    entity_id: opts.entityId ?? null,
    details:
      opts.details === undefined
        ? null
        : (opts.details as Record<string, unknown>),
    ip,
  })
}
