import { createClient } from '@/lib/supabase/server'
import { daysSince } from './format'
import {
  mapBuyer,
  mapCost,
  mapDealerAccount,
  mapDocument,
  mapItem,
  mapNote,
  mapOwnershipEvent,
  mapQuote,
  mapShipment,
  mapStaff,
  type BuyerRow,
  type BuyerRowDb,
  type CommissionerNoticeRow,
  type CostRow,
  type CostRowDb,
  type DashboardStats,
  type DealerAccountRow,
  type DocumentRow,
  type DocumentRowDb,
  type ItemRow,
  type ItemRowDb,
  type NoteEntityType,
  type NoteRow,
  type NoteRowDb,
  type OwnershipEventRow,
  type OwnershipEventRowDb,
  type QuoteRow,
  type QuoteRowDb,
  type ShipmentRow,
  type ShipmentRowDb,
  type ShipmentStatus,
  type StaffRow,
  type StaffRowDb,
  type NotificationRow,
  type NotificationRowDb,
  type AuditLogRow,
  type AuditLogRowDb,
} from './types'

export const SHIPMENT_STATUSES: { value: ShipmentStatus; label: string }[] = [
  { value: 'PRE_ORDER', label: 'Pre-order (collecting items)' },
  { value: 'PERMIT_APPLIED', label: 'Prior consent submitted' },
  { value: 'PERMIT_REJECTED', label: 'Prior consent rejected' },
  { value: 'SHIPPED', label: 'Shipped from origin' },
  { value: 'ARRIVED', label: 'Arrived in Malta' },
  { value: 'PROCESSING', label: 'Processing / customs' },
  { value: 'READY_FOR_COLLECTION', label: 'Ready for collection' },
  { value: 'CLOSED', label: 'Closed' },
]

export const TRASH_RETENTION_DAYS = 30

const ITEM_SELECT = `
  *,
  buyer:armory_buyers!armory_inventory_items_current_holder_buyer_id_fkey(first_names, surname),
  shipment:armory_shipments(reference, arrived_at)
`

type ItemQueryRow = ItemRowDb & {
  buyer: { first_names: string; surname: string } | null
  shipment: { reference: string; arrived_at: string | null } | null
}

function mapItemRow(row: ItemQueryRow): ItemRow {
  return mapItem(row, { buyer: row.buyer, shipment: row.shipment })
}

function matchesItemQuery(item: ItemRow, q: string): boolean {
  const needle = q.toLowerCase()
  return [
    item.make,
    item.model,
    item.serialNumber,
    item.shipmentReference,
    item.buyerName,
  ].some(value => value?.toLowerCase().includes(needle))
}

export async function listShipments(
  dealerAccountId: string
): Promise<(ShipmentRow & { itemCount: number; firearmCount: number })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_shipments')
    .select('*, armory_inventory_items(id, item_type)')
    .eq('dealer_account_id', dealerAccountId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(row => {
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
}

export async function getShipment(
  dealerAccountId: string,
  id: string
): Promise<ShipmentRow | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_shipments')
    .select('*')
    .eq('id', id)
    .eq('dealer_account_id', dealerAccountId)
    .maybeSingle()

  if (error) throw error
  return data ? mapShipment(data as ShipmentRowDb) : undefined
}

export async function listAllItems(
  dealerAccountId: string,
  filter?: { status?: string; itemType?: string; q?: string }
): Promise<ItemRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('armory_inventory_items')
    .select(ITEM_SELECT)
    .eq('dealer_account_id', dealerAccountId)
    .is('deleted_at', null)

  if (filter?.status) query = query.eq('status', filter.status)
  if (filter?.itemType === 'NON_FIREARM')
    query = query.neq('item_type', 'FIREARM')
  else if (filter?.itemType) query = query.eq('item_type', filter.itemType)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error

  let items = ((data ?? []) as ItemQueryRow[]).map(mapItemRow)
  if (filter?.q) items = items.filter(item => matchesItemQuery(item, filter.q!))
  return items
}

export async function getItem(
  dealerAccountId: string,
  id: string
): Promise<ItemRow | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_inventory_items')
    .select(ITEM_SELECT)
    .eq('id', id)
    .eq('dealer_account_id', dealerAccountId)
    .maybeSingle()

  if (error) throw error
  return data ? mapItemRow(data as ItemQueryRow) : undefined
}

export async function listTrash(dealerAccountId: string): Promise<ItemRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_inventory_items')
    .select(ITEM_SELECT)
    .eq('dealer_account_id', dealerAccountId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as ItemQueryRow[]).map(mapItemRow)
}

export async function listBuyers(
  dealerAccountId: string
): Promise<(BuyerRow & { itemCount: number })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_buyers')
    .select('*, armory_inventory_items(id)')
    .eq('dealer_account_id', dealerAccountId)
    .order('surname')
    .order('first_names')

  if (error) throw error

  return (data ?? []).map(row => {
    const buyer = mapBuyer(row as BuyerRowDb)
    const items = (row.armory_inventory_items ?? []) as { id: string }[]
    return { ...buyer, itemCount: items.length }
  })
}

export async function getBuyer(
  dealerAccountId: string,
  id: string
): Promise<BuyerRow | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_buyers')
    .select('*')
    .eq('id', id)
    .eq('dealer_account_id', dealerAccountId)
    .maybeSingle()

  if (error) throw error
  return data ? mapBuyer(data as BuyerRowDb) : undefined
}

export async function listQuotes(shipmentId: string): Promise<QuoteRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_shipping_quotes')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('created_at')

  if (error) throw error
  return ((data ?? []) as QuoteRowDb[]).map(mapQuote)
}

export async function listCosts(shipmentId: string): Promise<CostRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_shipment_costs')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('created_at')

  if (error) throw error
  return ((data ?? []) as CostRowDb[]).map(mapCost)
}

export async function listDocuments(
  dealerAccountId: string,
  filter?: { shipmentId?: string; inventoryItemId?: string }
): Promise<DocumentRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('armory_generated_documents')
    .select('*')
    .eq('dealer_account_id', dealerAccountId)
  if (filter?.shipmentId) query = query.eq('shipment_id', filter.shipmentId)
  if (filter?.inventoryItemId)
    query = query.eq('inventory_item_id', filter.inventoryItemId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as DocumentRowDb[]).map(mapDocument)
}

export async function listOwnershipEvents(
  inventoryItemId: string
): Promise<OwnershipEventRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_ownership_events')
    .select('*')
    .eq('inventory_item_id', inventoryItemId)
    .order('event_date')

  if (error) throw error
  return ((data ?? []) as OwnershipEventRowDb[]).map(mapOwnershipEvent)
}

export async function listNotes(
  dealerAccountId: string,
  entityType: NoteEntityType,
  entityId: string
): Promise<NoteRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_notes')
    .select('*')
    .eq('dealer_account_id', dealerAccountId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as NoteRowDb[]).map(mapNote)
}

export async function listNotificationsForShipment(
  dealerAccountId: string,
  shipmentId: string
): Promise<NotificationRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_notification_events')
    .select('*, buyer:armory_buyers(first_names, surname)')
    .eq('dealer_account_id', dealerAccountId)
    .eq('shipment_id', shipmentId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(row => {
    const buyer = row.buyer as {
      first_names: string
      surname: string
    } | null
    const n = row as NotificationRowDb
    return {
      id: n.id,
      buyerId: n.buyer_id,
      shipmentId: n.shipment_id,
      trigger: n.trigger_type,
      channel: n.channel,
      messageContent: n.message_content,
      deliveryStatus: n.delivery_status,
      sentAt: n.sent_at,
      providerRef: n.provider_ref,
      error: n.error,
      createdAt: n.created_at,
      buyerName: buyer ? `${buyer.first_names} ${buyer.surname}`.trim() : null,
    }
  })
}

export async function listStaff(dealerAccountId: string): Promise<StaffRow[]> {
  const supabase = await createClient()
  const { data: account, error: accountError } = await supabase
    .from('armory_dealer_accounts')
    .select('owner_id')
    .eq('id', dealerAccountId)
    .single()

  if (accountError) throw accountError

  const { data: staffRows, error: staffError } = await supabase
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
    member => member.profileId === account.owner_id
  )
  if (!ownerInStaff) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', account.owner_id)
      .maybeSingle()
    staff.unshift({
      id: account.owner_id,
      profileId: account.owner_id,
      email: ownerProfile?.email ?? null,
      name: null,
      role: 'owner',
      disabledAt: null,
      createdAt: '',
    })
  }

  return staff
}

export async function getDashboardStats(
  dealerAccountId: string
): Promise<DashboardStats> {
  const supabase = await createClient()
  const countQuery = () =>
    supabase
      .from('armory_inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_account_id', dealerAccountId)
      .is('deleted_at', null)

  const [inStock, reserved, pending, unpaid] = await Promise.all([
    countQuery().eq('status', 'AVAILABLE'),
    countQuery().eq('status', 'RESERVED'),
    countQuery().eq('status', 'PENDING_TRANSFER'),
    countQuery()
      .eq('current_holder_type', 'BUYER')
      .neq('payment_status', 'PAID'),
  ])

  if (inStock.error) throw inStock.error
  if (reserved.error) throw reserved.error
  if (pending.error) throw pending.error
  if (unpaid.error) throw unpaid.error

  return {
    inStock: inStock.count ?? 0,
    reserved: reserved.count ?? 0,
    pending: pending.count ?? 0,
    unpaid: unpaid.count ?? 0,
  }
}

export async function listDueCommissionerNotices(
  dealerAccountId: string
): Promise<CommissionerNoticeRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_inventory_items')
    .select(
      'id, make, model, serial_number, transferred_at, buyer:armory_buyers(first_names, surname)'
    )
    .eq('dealer_account_id', dealerAccountId)
    .eq('status', 'TRANSFERRED')
    .is('commissioner_notified_at', null)
    .order('transferred_at')

  if (error) throw error

  return (data ?? []).map(row => {
    const buyerRaw = row.buyer as
      | { first_names: string; surname: string }
      | { first_names: string; surname: string }[]
      | null
    const buyer = Array.isArray(buyerRaw) ? (buyerRaw[0] ?? null) : buyerRaw
    return {
      id: row.id,
      make: row.make,
      model: row.model,
      serialNumber: row.serial_number,
      transferredAt: row.transferred_at,
      buyerName: buyer ? `${buyer.first_names} ${buyer.surname}` : null,
      daysSinceTransfer: daysSince(row.transferred_at),
    }
  })
}

export async function getDealerAccount(dealerAccountId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_dealer_accounts')
    .select('*')
    .eq('id', dealerAccountId)
    .maybeSingle()
  if (error) throw error
  return data ? mapDealerAccount(data as DealerAccountRow) : undefined
}

export async function listItemsForShipment(
  dealerAccountId: string,
  shipmentId: string
): Promise<ItemRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_inventory_items')
    .select(ITEM_SELECT)
    .eq('dealer_account_id', dealerAccountId)
    .eq('shipment_id', shipmentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as ItemQueryRow[]).map(mapItemRow)
}

export async function listBuyerItems(
  dealerAccountId: string,
  buyerId: string
): Promise<ItemRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_inventory_items')
    .select(ITEM_SELECT)
    .eq('dealer_account_id', dealerAccountId)
    .eq('current_holder_buyer_id', buyerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as ItemQueryRow[]).map(mapItemRow)
}

export type DocumentListRow = DocumentRow & {
  shipmentReference: string | null
  make: string | null
  model: string | null
  serialNumber: string | null
  createdByEmail: string | null
}

export async function listDocumentsEnriched(
  dealerAccountId: string
): Promise<DocumentListRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('armory_generated_documents')
    .select(
      '*, shipment:armory_shipments(reference), item:armory_inventory_items(make, model, serial_number), creator:profiles(email)'
    )
    .eq('dealer_account_id', dealerAccountId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error

  return (data ?? []).map(row => {
    const doc = mapDocument(row as DocumentRowDb)
    const shipment = row.shipment as { reference: string } | null
    const item = row.item as {
      make: string | null
      model: string | null
      serial_number: string | null
    } | null
    const creator = row.creator as { email: string | null } | null
    return {
      ...doc,
      shipmentReference: shipment?.reference ?? null,
      make: item?.make ?? null,
      model: item?.model ?? null,
      serialNumber: item?.serial_number ?? null,
      createdByEmail: creator?.email ?? null,
    }
  })
}
