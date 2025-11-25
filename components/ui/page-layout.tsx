import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
type Padding = 'none' | 'sm' | 'md' | 'lg'

interface PageLayoutProps {
  children: ReactNode
  /**
   * Container size:
   * - 'sm': max-w-2xl (forms)
   * - 'md': max-w-4xl
   * - 'lg': max-w-7xl (stores, ranges)
   * - 'xl': container (blog, events, profile)
   * - 'full': full width
   */
  containerSize?: ContainerSize
  /**
   * Padding preset:
   * - 'none': no padding
   * - 'sm': p-4
   * - 'md': p-6
   * - 'lg': py-12 with px-4
   */
  padding?: Padding
  /**
   * Add space-y-8 to inner container
   */
  withSpacing?: boolean
  /**
   * Center content (useful for loading/error states)
   */
  centered?: boolean
  /**
   * Additional className for the outer container
   */
  className?: string
  /**
   * Additional className for the inner container
   */
  innerClassName?: string
}

export function PageLayout({
  children,
  containerSize = 'xl',
  padding = 'lg',
  withSpacing = false,
  centered = false,
  className,
  innerClassName,
}: PageLayoutProps) {
  // Map container size to Tailwind classes
  const containerClasses: Record<ContainerSize, string> = {
    sm: 'max-w-2xl mx-auto',
    md: 'max-w-4xl mx-auto',
    lg: 'max-w-7xl mx-auto',
    xl: 'container mx-auto px-4',
    full: 'w-full',
  }

  // Map padding to Tailwind classes
  const paddingClasses: Record<Padding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'py-12 px-4',
  }

  const outerClasses = cn(
    'min-h-screen bg-background',
    paddingClasses[padding],
    centered && 'flex items-center justify-center',
    className
  )

  const innerClasses = cn(
    !centered && containerClasses[containerSize],
    withSpacing && 'space-y-8',
    'relative',
    innerClassName
  )

  // If centered, don't use inner container
  if (centered) {
    return <div className={outerClasses}>{children}</div>
  }

  return (
    <div className={outerClasses}>
      <div className={innerClasses}>{children}</div>
    </div>
  )
}
