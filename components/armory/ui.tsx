import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Card as ShadCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge as ShadBadge } from '@/components/ui/badge'
import { Input as ShadInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea as ShadTextarea } from '@/components/ui/textarea'

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ')

export function Card({
  title,
  children,
  actions,
  className,
  description,
}: {
  title?: ReactNode
  children: ReactNode
  actions?: ReactNode
  className?: string
  description?: ReactNode
}) {
  return (
    <ShadCard className={className}>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b pb-4">
          <div className="space-y-1">
            {title && (
              <CardTitle className="text-sm font-semibold tracking-wide">
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 justify-end">{actions}</div>
          )}
        </CardHeader>
      )}
      <CardContent className={title || actions ? 'pt-4' : undefined}>
        {children}
      </CardContent>
    </ShadCard>
  )
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Input(props: React.ComponentProps<typeof ShadInput>) {
  return <ShadInput {...props} className={cn('text-sm', props.className)} />
}

export function Textarea(props: React.ComponentProps<typeof ShadTextarea>) {
  return (
    <ShadTextarea
      {...props}
      className={cn('min-h-20 text-sm', props.className)}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        props.className
      )}
    />
  )
}

const badgeTone: Record<string, string> = {
  neutral: 'bg-muted text-muted-foreground border-transparent',
  green: 'bg-emerald-100 text-emerald-800 border-transparent',
  amber: 'bg-amber-100 text-amber-800 border-transparent',
  red: 'bg-red-100 text-red-800 border-transparent',
  blue: 'bg-sky-100 text-sky-800 border-transparent',
  purple: 'bg-violet-100 text-violet-800 border-transparent',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: keyof typeof badgeTone
  className?: string
}) {
  return (
    <ShadBadge
      variant="outline"
      className={cn(
        'rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide whitespace-nowrap',
        badgeTone[tone],
        className
      )}
    >
      {children}
    </ShadBadge>
  )
}

export const ITEM_STATUS_TONE: Record<string, keyof typeof badgeTone> = {
  AVAILABLE: 'green',
  RESERVED: 'blue',
  PENDING_TRANSFER: 'amber',
  TRANSFERRED: 'purple',
  REJECTED: 'red',
}

export const ITEM_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'In stock',
  RESERVED: 'Reserved',
  PENDING_TRANSFER: 'Pending transfer',
  TRANSFERRED: 'Transferred',
  REJECTED: 'Rejected',
}

export const SHIPMENT_STATUS_TONE: Record<string, keyof typeof badgeTone> = {
  PRE_ORDER: 'neutral',
  PERMIT_APPLIED: 'blue',
  PERMIT_REJECTED: 'red',
  SHIPPED: 'amber',
  ARRIVED: 'amber',
  PROCESSING: 'amber',
  READY_FOR_COLLECTION: 'green',
  CLOSED: 'purple',
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'good' | 'bad'
}) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div
        className={cn(
          'text-2xl font-semibold tabular-nums',
          tone === 'good' && 'text-emerald-600',
          tone === 'bad' && 'text-red-600'
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 py-6 text-sm text-muted-foreground text-center">
      {children}
    </p>
  )
}

export function Table({
  children,
  className,
  scroll,
}: {
  children: ReactNode
  className?: string
  scroll?: boolean
}) {
  return (
    <div
      className={cn(
        '[scrollbar-width:thin]',
        scroll
          ? 'overflow-auto max-h-[65vh] rounded border mx-0'
          : 'overflow-x-auto',
        className
      )}
    >
      <table className="min-w-full text-sm" style={{ minWidth: 'max-content' }}>
        {children}
      </table>
    </div>
  )
}

export const th =
  'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b whitespace-nowrap bg-background'
export const td = 'px-3 py-2 align-top border-b'

export function BackLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link href={href} className="text-xs text-muted-foreground hover:underline">
      ← {children}
    </Link>
  )
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(
    s.includes('T') || s.includes(' ')
      ? s.replace(' ', 'T') + (s.length === 19 ? 'Z' : '')
      : s
  )
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-MT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function Warn({
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
        'text-xs rounded border px-3 py-2 space-y-1',
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

export const btnPrimary = ''
export const btnSecondary = ''
export const btnDanger = ''
export const btnSmall = ''

export function BtnPrimary(props: React.ComponentProps<typeof Button>) {
  return <Button {...props} />
}

export function BtnSecondary(props: React.ComponentProps<typeof Button>) {
  return <Button variant="outline" {...props} />
}

export function BtnDanger(props: React.ComponentProps<typeof Button>) {
  return <Button variant="destructive" {...props} />
}
