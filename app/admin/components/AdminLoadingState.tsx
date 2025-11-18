import { Loader2 } from 'lucide-react'

interface AdminLoadingStateProps {
  message?: string
}

/**
 * Consistent loading state for admin pages
 */
export function AdminLoadingState({
  message = 'Loading...',
}: AdminLoadingStateProps) {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
