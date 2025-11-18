import { ReactNode } from 'react'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface AdminPageLayoutProps {
  title: string
  children: ReactNode
  backHref?: string
  backLabel?: string
  actionButton?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
}

/**
 * Standard layout for admin pages with consistent header styling
 */
export function AdminPageLayout({
  title,
  children,
  backHref = '/admin',
  backLabel = 'Back to Dashboard',
  actionButton,
}: AdminPageLayoutProps) {
  const ActionIcon = actionButton?.icon

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-6">
          <BackButton label={backLabel} href={backHref} />
          {actionButton && (
            <Button onClick={actionButton.onClick}>
              {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
              {actionButton.label}
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
