import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

/**
 * Consistent error state for admin pages
 */
export function AdminErrorState({
  title = 'Error Loading Data',
  message,
  onRetry,
}: AdminErrorStateProps) {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center p-6 bg-destructive/10 border border-destructive rounded-lg max-w-lg">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-destructive mb-4">{title}</h2>
        <p className="mb-4 text-sm">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}
