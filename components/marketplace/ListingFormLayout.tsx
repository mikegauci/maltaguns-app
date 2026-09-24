import { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'

interface ListingFormLayoutProps {
  title: string
  description: string
  backHref: string
  children: ReactNode
  credits?: number
  showCredits?: boolean
  actions?: ReactNode
  maxWidth?: '2xl' | '3xl'
}

export function ListingFormLayout({
  title,
  description,
  children,
  credits,
  showCredits = false,
  actions,
  backHref,
  maxWidth = '2xl',
}: ListingFormLayoutProps) {
  const creditsBadge =
    showCredits && credits !== undefined ? (
      <Badge variant="secondary" className="rounded-sm px-3 py-1 text-sm">
        Credits: {credits}
      </Badge>
    ) : null

  const headerActions =
    creditsBadge || actions ? (
      <div className="flex items-center gap-2">
        {creditsBadge ? (
          <span className="hidden md:contents">{creditsBadge}</span>
        ) : null}
        {actions}
      </div>
    ) : undefined

  return (
    <PageLayout>
      <PageHeader
        align="center"
        backHref={backHref}
        title={title}
        description={description}
        afterDescription={
          creditsBadge ? (
            <span className="md:hidden">{creditsBadge}</span>
          ) : undefined
        }
        actions={headerActions}
        showMobileToolbar={Boolean(actions)}
        className="mb-6"
      />
      <div
        className={
          maxWidth === '3xl'
            ? 'mx-auto w-full max-w-3xl'
            : 'mx-auto w-full max-w-2xl'
        }
      >
        <Card className="rounded-sm border-border p-6 shadow-none">
          {children}
        </Card>
      </div>
    </PageLayout>
  )
}
