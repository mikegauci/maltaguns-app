import * as React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  featured?: boolean
}

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, featured = false, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(
        'app-card overflow-hidden',
        featured && 'border-2 border-primary',
        className
      )}
      {...props}
    />
  )
)
AppCard.displayName = 'AppCard'
