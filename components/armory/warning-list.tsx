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
        'space-y-1 rounded border px-3 py-2 text-xs',
        tone === 'amber'
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-red-300 bg-red-50 text-red-900'
      )}
    >
      {items.map((w, i) => (
        <li key={i}>• {w}</li>
      ))}
    </ul>
  )
}
