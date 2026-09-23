'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ActionResult =
  { ok: true; message?: string; id?: string } | { ok: false; error: string }

export function ActionForm({
  action,
  children,
  submitLabel = 'Save',
  className,
  resetOnSuccess,
  confirm,
  variant = 'primary',
  onDone,
  inline,
  submitAtTop,
}: {
  action: (fd: FormData) => Promise<ActionResult | void>
  children?: ReactNode
  submitLabel?: ReactNode
  className?: string
  resetOnSuccess?: boolean
  confirm?: string
  variant?: 'primary' | 'secondary' | 'danger'
  onDone?: (r: ActionResult) => void
  inline?: boolean
  submitAtTop?: boolean
}) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const router = useRouter()

  const btnVariant =
    variant === 'danger'
      ? 'destructive'
      : variant === 'secondary'
        ? 'outline'
        : 'default'

  return (
    <form
      className={cn(
        inline ? 'inline-flex items-center gap-2' : 'space-y-3',
        className
      )}
      onSubmit={e => {
        e.preventDefault()
        if (confirm && !window.confirm(confirm)) return
        const form = e.currentTarget
        const fd = new FormData(form)
        setMsg(null)
        start(async () => {
          try {
            const r = (await action(fd)) ?? { ok: true }
            if (r.ok) {
              if (r.message) setMsg({ ok: true, text: r.message })
              if (resetOnSuccess) form.reset()
              router.refresh()
            } else {
              setMsg({ ok: false, text: r.error })
            }
            onDone?.(r)
          } catch (err) {
            const d = (err as { digest?: string })?.digest ?? ''
            if (!String(d).startsWith('NEXT_REDIRECT')) {
              setMsg({
                ok: false,
                text: err instanceof Error ? err.message : 'Unexpected error',
              })
            }
          }
        })
      }}
    >
      {submitAtTop && (
        <div className={cn('flex items-center gap-3', inline && 'contents')}>
          <Button
            type="submit"
            disabled={pending}
            variant={btnVariant}
            size="sm"
          >
            {pending ? 'Working…' : submitLabel}
          </Button>
          {msg && (
            <span
              className={cn(
                'text-xs',
                msg.ok ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {msg.text}
            </span>
          )}
        </div>
      )}
      {children}
      <div className={cn('flex items-center gap-3', inline && 'contents')}>
        <Button type="submit" disabled={pending} variant={btnVariant} size="sm">
          {pending ? 'Working…' : submitLabel}
        </Button>
        {msg && (
          <span
            className={cn(
              'text-xs',
              msg.ok ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {msg.text}
          </span>
        )}
      </div>
    </form>
  )
}

export function ActionButton({
  action,
  children,
  confirm,
  variant = 'secondary',
  className,
  small,
  title,
}: {
  action: () => Promise<ActionResult | void>
  children: ReactNode
  confirm?: string
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
  small?: boolean
  title?: string
}) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const router = useRouter()
  const btnVariant =
    variant === 'danger'
      ? 'destructive'
      : variant === 'secondary'
        ? 'outline'
        : 'default'

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        title={title}
        disabled={pending}
        variant={btnVariant}
        size={small ? 'sm' : 'default'}
        className={className}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return
          setMsg(null)
          start(async () => {
            try {
              const r = (await action()) ?? { ok: true }
              if (r.ok) {
                if (r.message) setMsg({ ok: true, text: r.message })
                router.refresh()
              } else setMsg({ ok: false, text: r.error })
            } catch (err) {
              const d = (err as { digest?: string })?.digest ?? ''
              if (!String(d).startsWith('NEXT_REDIRECT')) {
                setMsg({
                  ok: false,
                  text: err instanceof Error ? err.message : 'Unexpected error',
                })
              }
            }
          })
        }}
      >
        {pending ? '…' : children}
      </Button>
      {msg && (
        <span
          className={cn(
            'text-xs max-w-md',
            msg.ok ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          {msg.text}
        </span>
      )}
    </span>
  )
}
