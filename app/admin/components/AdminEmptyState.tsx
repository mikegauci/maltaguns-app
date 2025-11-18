import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface AdminEmptyStateProps {
  message: string
  icon?: LucideIcon
}

/**
 * Consistent empty state for admin tables
 */
export function AdminEmptyState({ message, icon: Icon }: AdminEmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      {Icon && (
        <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      )}
      <p className="text-muted-foreground">{message}</p>
    </Card>
  )
}
