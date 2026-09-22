export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0
  return Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 999
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export function eur(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}
