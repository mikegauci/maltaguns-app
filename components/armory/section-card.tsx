import type { ReactNode } from 'react'
import { AppCard } from '@/components/design-system'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <AppCard className={className}>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            {title && (
              <CardTitle className="app-display text-lg font-bold tracking-tight">
                {title}
              </CardTitle>
            )}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && (
            <div className="flex flex-wrap justify-end gap-2">{actions}</div>
          )}
        </CardHeader>
      )}
      <CardContent className={title || actions ? undefined : 'pt-6'}>
        {children}
      </CardContent>
    </AppCard>
  )
}
