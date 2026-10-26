import { Badge } from '@/components/ui/badge'
import { STATUS_TONE_CLASS, type StatusTone } from '@/lib/armory/status-tones'
import { cn } from '@/lib/utils'

export function StatusBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: StatusTone
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        STATUS_TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </Badge>
  )
}
