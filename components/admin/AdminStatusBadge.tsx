import { Badge } from '@/components/ui/badge'
import {
  ADMIN_STATUS_TONE_CLASS,
  type AdminStatusTone,
} from '@/lib/admin/status-tones'
import { cn } from '@/lib/utils'

export function AdminStatusBadge({
  children,
  tone = 'neutral',
  className,
  title,
}: {
  children: React.ReactNode
  tone?: AdminStatusTone
  className?: string
  title?: string
}) {
  return (
    <Badge
      variant="outline"
      title={title}
      className={cn(
        'whitespace-nowrap rounded-sm text-xs font-medium',
        ADMIN_STATUS_TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </Badge>
  )
}
