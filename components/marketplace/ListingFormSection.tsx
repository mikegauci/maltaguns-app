import { ReactNode } from 'react'
import { AppSectionHeading } from '@/components/design-system'
import { cn } from '@/lib/utils'

interface ListingFormSectionProps {
  title: string
  children: ReactNode
  first?: boolean
  className?: string
}

export function ListingFormSection({
  title,
  children,
  first = false,
  className,
}: ListingFormSectionProps) {
  return (
    <section className={cn(!first && 'border-t border-border pt-6', className)}>
      <AppSectionHeading className="mb-4 text-lg">{title}</AppSectionHeading>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
