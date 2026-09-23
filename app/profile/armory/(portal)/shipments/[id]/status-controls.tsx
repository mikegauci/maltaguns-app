'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionResult } from '@/components/armory/action-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Status = { value: string; label: string }

export function StatusControls({
  shipmentId,
  current,
  statuses,
  providerConfigured = false,
  setStatus,
}: {
  shipmentId: string
  current: string
  statuses: Status[]
  providerConfigured?: boolean
  setStatus: (
    id: string,
    status: string,
    opts?: { notify?: boolean; reason?: string }
  ) => Promise<ActionResult>
}) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [next, setNext] = useState(current)
  const [notify, setNotify] = useState(true)
  const [reason, setReason] = useState('')
  const router = useRouter()
  const idx = statuses.findIndex(s => s.value === current)
  const notifies = [
    'PERMIT_APPLIED',
    'SHIPPED',
    'READY_FOR_COLLECTION',
  ].includes(next)

  return (
    <div className="space-y-2">
      <ol className="flex flex-wrap gap-1 text-xs">
        {statuses
          .filter(s => s.value !== 'PERMIT_REJECTED')
          .map(s => {
            const i = statuses.findIndex(x => x.value === s.value)
            const done = i <= idx && current !== 'PERMIT_REJECTED'
            return (
              <li
                key={s.value}
                className={cn(
                  'rounded-full border px-2 py-0.5',
                  done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground'
                )}
              >
                {s.label}
              </li>
            )
          })}
      </ol>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs">
          <span className="block text-muted-foreground">Move to</span>
          <select
            name="status"
            value={next}
            onChange={e => setNext(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            {statuses.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {next === 'PERMIT_REJECTED' && (
          <label className="min-w-48 flex-1 space-y-1 text-xs">
            <span className="block text-muted-foreground">
              Reason given by the Weapons Office
            </span>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. missing serial numbers on annex"
            />
          </label>
        )}
        {notifies && (
          <label className="inline-flex items-center gap-1 pb-2 text-xs">
            <input
              type="checkbox"
              checked={notify}
              onChange={e => setNotify(e.target.checked)}
            />{' '}
            Notify buyers{providerConfigured ? '' : ' (log only)'}
          </label>
        )}
        <Button
          type="button"
          disabled={pending || next === current}
          variant={next === current ? 'outline' : 'default'}
          size="sm"
          onClick={() =>
            start(async () => {
              setMsg(null)
              const r = await setStatus(shipmentId, next, { notify, reason })
              setMsg(
                r.ok
                  ? { ok: true, text: r.message ?? 'Updated' }
                  : { ok: false, text: r.error }
              )
              router.refresh()
            })
          }
        >
          {pending ? 'Updating…' : 'Update status'}
        </Button>
      </div>
      {msg && (
        <p
          className={cn(
            'text-xs',
            msg.ok ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          {msg.text}
        </p>
      )}
    </div>
  )
}
