export type AdminStatusTone =
  'neutral' | 'pending' | 'active' | 'success' | 'rejected' | 'info' | 'violet'

export const ADMIN_STATUS_TONE_CLASS: Record<AdminStatusTone, string> = {
  neutral:
    'border-border bg-muted/30 text-muted-foreground hover:bg-transparent',
  pending: 'border-amber-600 text-amber-400 hover:bg-transparent',
  active: 'border-emerald-600 text-emerald-400 hover:bg-transparent',
  success: 'border-emerald-600 text-emerald-400 hover:bg-transparent',
  rejected: 'border-destructive text-destructive hover:bg-transparent',
  info: 'border-sky-600 text-sky-400 hover:bg-transparent',
  violet: 'border-violet-600 text-violet-400 hover:bg-transparent',
}
