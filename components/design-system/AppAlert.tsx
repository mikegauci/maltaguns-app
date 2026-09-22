import * as React from 'react'
import { X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type AppAlertVariant = 'pending' | 'rejected' | 'success'

const variantClasses: Record<AppAlertVariant, string> = {
  pending: 'border-amber-900/50 bg-amber-950/40 text-amber-100',
  rejected: 'border-red-900/50 bg-red-950/40 text-red-100',
  success: 'border-green-900/50 bg-green-950/40 text-green-100',
}

interface AppAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: AppAlertVariant
  icon?: React.ReactNode
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
  children: React.ReactNode
}

export function AppAlert({
  variant,
  icon,
  title,
  dismissible = false,
  onDismiss,
  children,
  className,
  ...props
}: AppAlertProps) {
  return (
    <Alert
      className={cn(
        'rounded-sm',
        variantClasses[variant],
        dismissible && 'pr-12',
        className
      )}
      {...props}
    >
      {icon}
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{children}</AlertDescription>
      {dismissible && onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </Alert>
  )
}
