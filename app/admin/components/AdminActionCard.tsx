import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AdminActionCardProps {
  label: string
  count: number | null
  description: string
  href: string
  icon: LucideIcon
}

export function AdminActionCard({
  label,
  count,
  description,
  href,
  icon: Icon,
}: AdminActionCardProps) {
  const needsAttention = typeof count === 'number' && count > 0

  return (
    <Link href={href}>
      <Card
        className={cn(
          'h-full transition-colors hover:bg-accent/30',
          needsAttention
            ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500'
            : 'hover:border-primary/30'
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <Icon
            className={cn(
              'h-4 w-4',
              needsAttention ? 'text-amber-600' : 'text-muted-foreground'
            )}
          />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{count ?? '—'}</span>
            {needsAttention && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-900"
              >
                Needs attention
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
