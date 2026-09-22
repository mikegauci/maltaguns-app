import { cn } from '@/lib/utils'

interface AppSectionHeadingProps {
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

export function AppSectionHeading({
  children,
  className,
  icon,
}: AppSectionHeadingProps) {
  return (
    <h2
      className={cn(
        'app-display mb-4 flex items-center text-xl font-bold uppercase tracking-tight',
        className
      )}
    >
      {icon}
      {children}
    </h2>
  )
}
