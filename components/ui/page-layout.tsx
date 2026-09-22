import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: ReactNode
  className?: string
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-[calc(100vh-var(--header-height))] bg-background py-8 lg:py-12',
        className
      )}
    >
      <div className="relative mx-auto w-full max-w-7xl px-6">{children}</div>
    </div>
  )
}
