import type { ItemRow, CostRow, ShipmentRow } from './types'
export { eur } from './format'

export type AllocationMethod =
  'EVEN_SPLIT' | 'FIREARMS_ONLY_EVEN' | 'VALUE_WEIGHTED'

export const ALLOCATION_METHODS: {
  value: AllocationMethod
  label: string
  help: string
}[] = [
  {
    value: 'EVEN_SPLIT',
    label: 'Split evenly across all items',
    help: 'Every item, firearm or accessory, carries an equal share of the shipment costs.',
  },
  {
    value: 'FIREARMS_ONLY_EVEN',
    label: 'Firearms only, split evenly',
    help: 'Accessories and components carry no shipping cost; firearms share it equally.',
  },
  {
    value: 'VALUE_WEIGHTED',
    label: 'In proportion to item value',
    help: 'Each item carries a share of the cost proportional to its acquisition price.',
  },
]

export type ItemEconomics = {
  itemId: string
  acquisition: number
  allocatedShipping: number
  totalCost: number
  revenue: number
  profit: number
  outstanding: number
}

export function allocateShipment(
  items: ItemRow[],
  costs: CostRow[],
  method: AllocationMethod
): Map<string, number> {
  const total = costs.reduce((s, c) => s + (c.amount || 0), 0)
  const out = new Map<string, number>()
  if (items.length === 0 || total === 0) {
    items.forEach(i => out.set(i.id, 0))
    return out
  }
  const eligible =
    method === 'FIREARMS_ONLY_EVEN'
      ? items.filter(i => i.itemType === 'FIREARM')
      : items
  if (eligible.length === 0) {
    items.forEach(i => out.set(i.id, 0))
    return out
  }
  if (method === 'VALUE_WEIGHTED') {
    const value = (i: ItemRow) =>
      (i.acquisitionPrice ?? 0) + (i.egunDomesticShippingFee ?? 0)
    const sum = eligible.reduce((s, i) => s + value(i), 0)
    items.forEach(i => out.set(i.id, 0))
    if (sum === 0) {
      eligible.forEach(i => out.set(i.id, total / eligible.length))
    } else {
      eligible.forEach(i => out.set(i.id, (total * value(i)) / sum))
    }
    return out
  }
  const share = total / eligible.length
  items.forEach(i => out.set(i.id, 0))
  eligible.forEach(i => out.set(i.id, share))
  return out
}

export function itemEconomics(item: ItemRow, allocated: number): ItemEconomics {
  const acquisition =
    (item.acquisitionPrice ?? 0) + (item.egunDomesticShippingFee ?? 0)
  const totalCost = acquisition + allocated
  const sold = item.currentHolderType === 'BUYER'
  const revenue = sold
    ? (item.salePrice ?? 0) + (item.clientHandlingFee ?? 0)
    : 0
  const outstanding = sold ? Math.max(0, revenue - (item.amountPaid ?? 0)) : 0
  return {
    itemId: item.id,
    acquisition,
    allocatedShipping: allocated,
    totalCost,
    revenue,
    profit: revenue - totalCost,
    outstanding,
  }
}

export type ShipmentSummary = {
  shipment: ShipmentRow
  itemCount: number
  acquisition: number
  shippingCosts: number
  totalCost: number
  revenue: number
  profit: number
  outstanding: number
  unsoldCost: number
}

export function summariseShipment(
  shipment: ShipmentRow,
  items: ItemRow[],
  costs: CostRow[],
  method: AllocationMethod
): ShipmentSummary {
  const alloc = allocateShipment(items, costs, method)
  let acquisition = 0,
    revenue = 0,
    outstanding = 0,
    unsoldCost = 0
  for (const i of items) {
    const e = itemEconomics(i, alloc.get(i.id) ?? 0)
    acquisition += e.acquisition
    revenue += e.revenue
    outstanding += e.outstanding
    if (i.currentHolderType !== 'BUYER') unsoldCost += e.totalCost
  }
  const shippingCosts = costs.reduce((s, c) => s + c.amount, 0)
  const totalCost = acquisition + shippingCosts
  return {
    shipment,
    itemCount: items.length,
    acquisition,
    shippingCosts,
    totalCost,
    revenue,
    profit: revenue - totalCost,
    outstanding,
    unsoldCost,
  }
}
