import { cn } from '@/lib/utils'

export function WarningList({
  items,
  tone = 'amber',
}: {
  items: string[]
  tone?: 'amber' | 'red'
}) {
  if (!items.length) return null
  return (
    <ul
      className={cn(
        'space-y-1 rounded-sm border px-3 py-2 text-xs',
        tone === 'amber'
          ? 'border-amber-900/50 bg-amber-950/40 text-amber-100'
          : 'border-red-900/50 bg-red-950/40 text-red-100'
      )}
    >
      {items.map((w, i) => (
        <li key={i}>• {w}</li>
      ))}
    </ul>
  )
}
