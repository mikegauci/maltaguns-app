export type StatusTone =
  'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple'

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-muted text-muted-foreground border-transparent',
  green: 'bg-emerald-100 text-emerald-800 border-transparent',
  amber: 'bg-amber-100 text-amber-800 border-transparent',
  red: 'bg-red-100 text-red-800 border-transparent',
  blue: 'bg-sky-100 text-sky-800 border-transparent',
  purple: 'bg-violet-100 text-violet-800 border-transparent',
}

export const ITEM_STATUS_TONE: Record<string, StatusTone> = {
  AVAILABLE: 'green',
  RESERVED: 'blue',
  PENDING_TRANSFER: 'amber',
  TRANSFERRED: 'purple',
  REJECTED: 'red',
}

export const ITEM_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'In stock',
  RESERVED: 'Reserved',
  PENDING_TRANSFER: 'Pending transfer',
  TRANSFERRED: 'Transferred',
  REJECTED: 'Rejected',
}

export const SHIPMENT_STATUS_TONE: Record<string, StatusTone> = {
  PRE_ORDER: 'neutral',
  PERMIT_APPLIED: 'blue',
  PERMIT_REJECTED: 'red',
  SHIPPED: 'amber',
  ARRIVED: 'amber',
  PROCESSING: 'amber',
  READY_FOR_COLLECTION: 'green',
  CLOSED: 'purple',
}
