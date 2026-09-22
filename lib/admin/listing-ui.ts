import type { AdminStatusTone } from '@/lib/admin/status-tones'

export function listingStatusTone(displayStatus: string): AdminStatusTone {
  switch (displayStatus) {
    case 'active':
      return 'active'
    case 'pending':
      return 'pending'
    case 'sold':
      return 'success'
    case 'expired':
    case 'inactive':
      return 'neutral'
    default:
      return 'rejected'
  }
}
