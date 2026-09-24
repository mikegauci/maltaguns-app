import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { LucideIcon } from 'lucide-react'

interface AdminPageLayoutProps {
  title: string
  description?: string
  children: ReactNode
  titleUppercase?: boolean
  actionButton?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
}

export function AdminPageLayout({
  title,
  description,
  children,
  titleUppercase = true,
  actionButton,
}: AdminPageLayoutProps) {
  const ActionIcon = actionButton?.icon

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        titleUppercase={titleUppercase}
        actions={
          actionButton ? (
            <Button onClick={actionButton.onClick} className="shrink-0">
              {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
              {actionButton.label}
            </Button>
          ) : undefined
        }
      />
      {children}
    </div>
  )
}
