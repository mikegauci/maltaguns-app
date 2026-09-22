import { cn } from '@/lib/utils'
import type { AdminStatusTone } from '@/lib/admin/status-tones'

export function establishmentTypeTone(type: string): AdminStatusTone {
  switch (type) {
    case 'store':
      return 'info'
    case 'club':
      return 'active'
    case 'servicing':
      return 'pending'
    case 'range':
      return 'violet'
    default:
      return 'neutral'
  }
}

export function establishmentStatusTone(status: string): AdminStatusTone {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'rejected':
      return 'rejected'
    case 'active':
      return 'active'
    default:
      return 'neutral'
  }
}

export function typeSelectorCardClass(selected: boolean): string {
  return cn(
    'cursor-pointer rounded-sm border p-3',
    selected ? 'border-primary bg-chrome-slate/50' : 'border-border bg-card'
  )
}

export function establishmentStatTileClass(): string {
  return 'rounded-sm border border-border bg-muted/20 p-4'
}
