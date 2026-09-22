export type StatusTone =
  'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple'

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'border-border bg-muted/30 text-muted-foreground',
  green: 'border-emerald-700/50 bg-emerald-950/40 text-emerald-400',
  amber: 'border-amber-700/50 bg-amber-950/40 text-amber-400',
  red: 'border-red-700/50 bg-red-950/40 text-red-400',
  blue: 'border-sky-700/50 bg-sky-950/40 text-sky-400',
  purple: 'border-violet-700/50 bg-violet-950/40 text-violet-400',
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
