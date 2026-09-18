import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AdminStatCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  href?: string
  className?: string
}

export function AdminStatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  href,
  className,
}: AdminStatCardProps) {
  const content = (
    <Card
      className={cn(
        href && 'transition-colors hover:border-primary/30 hover:bg-accent/30',
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
