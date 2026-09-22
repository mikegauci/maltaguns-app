import { BackButton } from '@/components/ui/back-button'
import { cn } from '@/lib/utils'

interface AppPageToolbarProps {
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
  className?: string
}

export function AppPageToolbar({
  backHref,
  backLabel = 'Back',
  actions,
  className,
}: AppPageToolbarProps) {
  if (!backHref && !actions) return null

  return (
    <div
      className={cn(
        'mb-4 flex items-center gap-3',
        backHref && actions
          ? 'justify-between'
          : actions
            ? 'justify-end'
            : 'justify-start',
        className
      )}
    >
      {backHref ? (
        <BackButton
          label={backLabel}
          href={backHref}
          hideLabelOnMobile={false}
        />
      ) : null}
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
