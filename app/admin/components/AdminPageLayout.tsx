import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface AdminPageLayoutProps {
  title: string
  description?: string
  children: ReactNode
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
  actionButton,
}: AdminPageLayoutProps) {
  const ActionIcon = actionButton?.icon

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actionButton && (
          <Button onClick={actionButton.onClick} className="shrink-0">
            {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
            {actionButton.label}
          </Button>
        )}
      </div>
      {children}
    </div>
  )
}
