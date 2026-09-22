import { cn } from '@/lib/utils'
import { BackButton } from '@/components/ui/back-button'

interface PageHeaderProps {
  title: string
  description?: string | React.ReactNode
  className?: string
  actions?: React.ReactNode
  backHref?: string
  backLabel?: string
  uppercase?: boolean
}

export function PageHeader({
  title,
  description,
  className,
  actions,
  backHref,
  backLabel = 'Back',
  uppercase = true,
}: PageHeaderProps) {
  return (
    <>
      {backHref ? (
        <div className="mb-4">
          <BackButton
            label={backLabel}
            href={backHref}
            hideLabelOnMobile={false}
          />
        </div>
      ) : null}
      <div
        className={cn(
          'mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between',
          className
        )}
      >
        <div className="max-w-2xl">
          <h1
            className={cn(
              'app-display text-2xl font-bold tracking-tight text-foreground md:text-3xl text-balance',
              uppercase && 'uppercase'
            )}
          >
            {title}
          </h1>
          {description ? (
            <div className="mt-2 max-w-prose text-sm text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </>
  )
}
