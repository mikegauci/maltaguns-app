import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'good' | 'bad'
}) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <div
        className={cn(
          'text-2xl font-semibold tabular-nums',
          tone === 'good' && 'text-emerald-600',
          tone === 'bad' && 'text-red-600'
        )}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
