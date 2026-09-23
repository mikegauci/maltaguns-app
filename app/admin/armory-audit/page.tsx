'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { ArmoryAuditTable } from '@/components/admin/armory-audit-table'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { useToast } from '@/hooks/use-toast'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import type { AuditLogRow } from '@/lib/armory/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ArmoryAuditPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [action, setAction] = useState(searchParams.get('action') ?? '')
  const [dealerAccountId, setDealerAccountId] = useState(
    searchParams.get('dealerAccountId') ?? ''
  )

  const loadAudit = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (action) params.set('action', action)
    if (dealerAccountId) params.set('dealerAccountId', dealerAccountId)

    const res = await fetch(
      `/api/admin/armory-audit${params.size ? `?${params.toString()}` : ''}`
    )
    const data = await res.json()
    if (!res.ok) {
      toast({
        title: 'Error loading audit log',
        description: data.error ?? 'Failed to load audit log',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }
    setRows(data.rows ?? [])
    setActions(data.actions ?? [])
    setLoading(false)
  }, [action, dealerAccountId, q, toast])

  useEffect(() => {
    if (!isAuthorized) return
    scheduleEffectWork(() => {
      void loadAudit()
    })
  }, [isAuthorized, loadAudit])

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  return (
    <AdminPageLayout
      title="Armory audit log"
      description="Every login, registration, approval, item change, document generation and notification across all dealers. Append-only."
    >
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={e => {
          e.preventDefault()
          loadAudit()
        }}
      >
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="email, dealer, IP, details…"
          className="w-56"
        />
        <Select
          value={action || 'all'}
          onValueChange={v => setAction(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map(a => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={dealerAccountId}
          onChange={e => setDealerAccountId(e.target.value)}
          placeholder="Dealer account ID (optional)"
          className="w-72"
        />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {dealerAccountId && (
          <Button asChild variant="outline">
            <Link href={`/admin/armory-dealers/${dealerAccountId}`}>
              Dealer detail
            </Link>
          </Button>
        )}
      </form>

      {loading ? (
        <AdminLoadingState />
      ) : (
        <div className="rounded-md border p-4">
          <ArmoryAuditTable rows={rows} showDealer />
        </div>
      )}
    </AdminPageLayout>
  )
}
