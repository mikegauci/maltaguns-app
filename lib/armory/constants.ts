import type { ShipmentStatus } from './types'

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
