import { cn } from '@/lib/utils'

type AdminInlineNoticeVariant = 'pending' | 'info'

const variantClasses: Record<AdminInlineNoticeVariant, string> = {
  pending: 'border-amber-900/50 bg-amber-950/40 text-amber-100',
  info: 'border-border bg-muted/30 text-muted-foreground',
}

export function AdminInlineNotice({
  children,
  variant = 'pending',
  className,
}: {
  children: React.ReactNode
  variant?: AdminInlineNoticeVariant
  className?: string
}) {
  return (
    <p
      className={cn(
        'rounded-sm border px-2 py-1.5 text-xs',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </p>
  )
}
