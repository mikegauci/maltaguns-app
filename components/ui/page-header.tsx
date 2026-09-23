import { cn } from '@/lib/utils'
import { BackButton } from '@/components/ui/back-button'

interface PageHeaderProps {
  title: string
  description?: string | React.ReactNode
  className?: string
  actions?: React.ReactNode
  afterDescription?: React.ReactNode
  showMobileToolbar?: boolean
  backHref?: string
  backLabel?: string
  titleUppercase?: boolean
  align?: 'left' | 'center'
}

export function PageHeader({
  title,
  description,
  className,
  actions,
  afterDescription,
  showMobileToolbar,
  backHref,
  backLabel = 'Back',
  titleUppercase = true,
  align = 'left',
}: PageHeaderProps) {
  const centered = align === 'center'
  const centeredWithToolbar = centered && Boolean(backHref || actions)
  const useMobileToolbar = showMobileToolbar ?? Boolean(actions)

  const titleBlock = (
    <>
      <h1
        className={cn(
          'app-display text-2xl font-bold tracking-tight text-foreground md:text-3xl text-balance',
          titleUppercase && 'uppercase',
          centered && 'text-center'
        )}
      >
        {title}
      </h1>
      {description ? (
        <div
          className={cn(
            'mt-2 max-w-prose text-sm text-muted-foreground',
            centered && 'mx-auto text-center'
          )}
        >
          {description}
        </div>
      ) : null}
      {afterDescription ? (
        <div className={cn('mt-3', centered && 'flex justify-center')}>
          {afterDescription}
        </div>
      ) : null}
    </>
  )

  if (centeredWithToolbar) {
    return (
      <div className={cn('mb-8 border-b border-border pb-6', className)}>
        <div className="md:hidden">
          {useMobileToolbar && actions ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                {backHref ? (
                  <BackButton
                    label={backLabel}
                    href={backHref}
                    hideLabelOnMobile
                  />
                ) : (
                  <span aria-hidden className="size-8 shrink-0" />
                )}
                <div className="shrink-0">{actions}</div>
              </div>
              <div className="mx-auto max-w-3xl text-center">{titleBlock}</div>
            </>
          ) : (
            <div className="relative">
              {backHref ? (
                <div className="absolute left-0 top-0.5">
                  <BackButton
                    label={backLabel}
                    href={backHref}
                    hideLabelOnMobile
                    className="border-transparent bg-transparent shadow-none hover:bg-muted"
                  />
                </div>
              ) : null}
              <div
                className={cn(
                  'mx-auto max-w-3xl text-center',
                  backHref && 'px-10'
                )}
              >
                {titleBlock}
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-start gap-x-4">
          <div className="flex justify-start self-start">
            {backHref ? (
              <BackButton
                label={backLabel}
                href={backHref}
                hideLabelOnMobile={false}
              />
            ) : null}
          </div>
          <div className="max-w-3xl text-center">{titleBlock}</div>
          <div className="flex justify-end self-start">
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      </div>
    )
  }

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
          'mb-8 flex flex-col gap-4 border-b border-border pb-6',
          centered
            ? 'items-center text-center'
            : 'sm:flex-row sm:items-end sm:justify-between',
          className
        )}
      >
        <div className={cn(centered ? 'mx-auto max-w-3xl' : 'max-w-2xl')}>
          {titleBlock}
        </div>
        {actions ? (
          <div className={cn('shrink-0', centered && 'mx-auto')}>{actions}</div>
        ) : null}
      </div>
    </>
  )
}
