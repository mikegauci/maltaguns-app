import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AuditLogRow, AuditLogRowDb } from '@/lib/armory/types'
import {
  mapDealerAccount,
  mapStaff,
  type DealerAccountRow,
  type StaffRowDb,
} from '@/lib/armory/types'
import { mapShipment, type ShipmentRowDb } from '@/lib/armory/types'

function formatDetails(details: AuditLogRowDb['details']): string | null {
  if (details === null || details === undefined) return null
  if (typeof details === 'string') return details
  try {
    return JSON.stringify(details)
  } catch {
    return String(details)
  }
}

export async function getAdminDealerDetail(dealerAccountId: string) {
  const { data: dealer, error } = await supabaseAdmin
    .from('armory_dealer_accounts')
    .select('*')
    .eq('id', dealerAccountId)
    .maybeSingle()

  if (error) throw error
  if (!dealer) return null

  const { data: ownerProfile } = await supabaseAdmin
    .from('profiles')
    .select('email, first_name, last_name, username')
    .eq('id', dealer.owner_id)
    .maybeSingle()

  const { data: staffRows, error: staffError } = await supabaseAdmin
    .from('armory_dealer_staff')
    .select('*, profiles(email)')
    .eq('dealer_account_id', dealerAccountId)
    .order('created_at')

  if (staffError) throw staffError

  const staff = (staffRows ?? []).map(row => {
    const profile = row.profiles as { email: string | null } | null
    return mapStaff(row as StaffRowDb, profile?.email ?? null)
  })

  const ownerInStaff = staff.some(
    member => member.profileId === dealer.owner_id
  )
  if (!ownerInStaff) {
    staff.unshift({
      id: dealer.owner_id,
      profileId: dealer.owner_id,
      email: ownerProfile?.email ?? null,
      name:
        [ownerProfile?.first_name, ownerProfile?.last_name]
          .filter(Boolean)
          .join(' ') ||
        ownerProfile?.username ||
        null,
      role: 'owner',
      disabledAt: null,
      createdAt: '',
    })
  }

  const { data: shipmentRows, error: shipmentError } = await supabaseAdmin
    .from('armory_shipments')
    .select('*, armory_inventory_items(id, item_type)')
    .eq('dealer_account_id', dealerAccountId)
    .order('created_at', { ascending: false })

  if (shipmentError) throw shipmentError

  const shipments = (shipmentRows ?? []).map(row => {
    const items = (row.armory_inventory_items ?? []) as {
      id: string
      item_type: string
    }[]
    const shipment = mapShipment(row as ShipmentRowDb)
    return {
      ...shipment,
      itemCount: items.length,
      firearmCount: items.filter(item => item.item_type === 'FIREARM').length,
    }
  })

  const audit = await listAdminAuditLog({
    dealerAccountId,
    limit: 100,
  })

  return {
    dealer: mapDealerAccount(dealer as DealerAccountRow),
    ownerEmail: ownerProfile?.email ?? null,
    ownerName:
      [ownerProfile?.first_name, ownerProfile?.last_name]
        .filter(Boolean)
        .join(' ') ||
      ownerProfile?.username ||
      null,
    staff,
    shipments,
    audit,
  }
}

export async function listAdminAuditLog(opts?: {
  dealerAccountId?: string
  action?: string
  q?: string
  limit?: number
}): Promise<AuditLogRow[]> {
  let query = supabaseAdmin
    .from('armory_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 500)

  if (opts?.dealerAccountId) {
    query = query.eq('dealer_account_id', opts.dealerAccountId)
  }
  if (opts?.action) {
    query = query.eq('action', opts.action)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as AuditLogRowDb[]
  const profileIds = Array.from(
    new Set(rows.map(r => r.profile_id).filter(Boolean))
  ) as string[]
  const dealerIds = Array.from(
    new Set(rows.map(r => r.dealer_account_id).filter(Boolean))
  ) as string[]

  const [{ data: profiles }, { data: dealers }] = await Promise.all([
    profileIds.length
      ? supabaseAdmin.from('profiles').select('id, email').in('id', profileIds)
      : Promise.resolve({ data: [] }),
    dealerIds.length
      ? supabaseAdmin
          .from('armory_dealer_accounts')
          .select('id, company_name')
          .in('id', dealerIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.email]))
  const dealerMap = new Map((dealers ?? []).map(d => [d.id, d.company_name]))

  let mapped = rows.map(row => ({
    id: row.id,
    profileId: row.profile_id,
    dealerAccountId: row.dealer_account_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: formatDetails(row.details),
    ip: row.ip,
    createdAt: row.created_at,
    userEmail: row.profile_id ? (profileMap.get(row.profile_id) ?? null) : null,
    dealerName: row.dealer_account_id
      ? (dealerMap.get(row.dealer_account_id) ?? null)
      : null,
  }))

  if (opts?.q) {
    const needle = opts.q.toLowerCase()
    mapped = mapped.filter(
      row =>
        row.userEmail?.toLowerCase().includes(needle) ||
        row.dealerName?.toLowerCase().includes(needle) ||
        row.details?.toLowerCase().includes(needle) ||
        row.ip?.toLowerCase().includes(needle) ||
        row.action.toLowerCase().includes(needle)
    )
  }

  return mapped
}

export async function listAdminAuditActions(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('armory_audit_log')
    .select('action')

  if (error) throw error
  return Array.from(new Set((data ?? []).map(r => r.action))).sort()
}
