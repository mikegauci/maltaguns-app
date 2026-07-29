import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: ReactNode
  className?: string
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div
      className={cn('min-h-screen bg-background md:py-8 py-6 px-4', className)}
    >
      <div className="container mx-auto md:px-4 px-0 relative">{children}</div>
    </div>
  )
}
