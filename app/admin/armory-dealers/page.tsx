'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { useToast } from '@/hooks/use-toast'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type DealerRow = {
  id: string
  company_name: string
  dealer_licence_number: string | null
  dealer_licence_expiry: string | null
  account_status: 'pending' | 'approved' | 'suspended'
  status_note: string | null
  phone_number: string | null
  created_at: string
  owner_id: string
  ownerEmail?: string
  ownerName?: string
}

function statusBadge(status: DealerRow['account_status']) {
  if (status === 'approved')
    return <Badge className="bg-green-600">Approved</Badge>
  if (status === 'suspended')
    return <Badge variant="destructive">Suspended</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

export default function ArmoryDealersPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })
  const [dealers, setDealers] = useState<DealerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') ?? 'all'
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    dealer: DealerRow
    status: 'approved' | 'suspended'
  } | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadDealers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    }

    const res = await fetch(
      `/api/admin/armory-dealers${params.size ? `?${params.toString()}` : ''}`
    )
    const data = await res.json()

    if (!res.ok) {
      toast({
        title: 'Error loading dealers',
        description: data.error ?? 'Failed to load dealers',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    setDealers(data.dealers ?? [])
    setLoading(false)
  }, [statusFilter, toast])

  useEffect(() => {
    if (!isAuthorized) return
    scheduleEffectWork(() => {
      void loadDealers()
    })
  }, [isAuthorized, loadDealers])

  async function confirmStatusChange() {
    if (!pendingAction) return
    setSubmitting(true)
    const res = await fetch('/api/admin/armory-dealers/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: pendingAction.dealer.id,
        status: pendingAction.status,
        note: note || undefined,
      }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Success', description: data.message })
    setDialogOpen(false)
    setPendingAction(null)
    setNote('')
    loadDealers()
    window.dispatchEvent(new CustomEvent('admin-nav-badges-refresh'))
  }

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  return (
    <AdminPageLayout
      title="Armory Dealers"
      description="Review and approve dealership registrations for the Armory platform."
    >
      <div className="mb-4 flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <AdminLoadingState />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Licence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No dealers found
                  </TableCell>
                </TableRow>
              ) : (
                dealers.map(dealer => (
                  <TableRow key={dealer.id}>
                    <TableCell className="font-medium">
                      {dealer.company_name}
                    </TableCell>
                    <TableCell>
                      <div>{dealer.ownerName ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {dealer.ownerEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{dealer.dealer_licence_number ?? '—'}</div>
                      {dealer.dealer_licence_expiry && (
                        <div className="text-xs text-muted-foreground">
                          Expires {dealer.dealer_licence_expiry}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(dealer.account_status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(dealer.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {dealer.account_status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setPendingAction({ dealer, status: 'approved' })
                            setDialogOpen(true)
                          }}
                        >
                          Approve
                        </Button>
                      )}
                      {dealer.account_status !== 'suspended' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPendingAction({ dealer, status: 'suspended' })
                            setDialogOpen(true)
                          }}
                        >
                          Suspend
                        </Button>
                      )}
                      {dealer.account_status === 'suspended' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPendingAction({ dealer, status: 'approved' })
                            setDialogOpen(true)
                          }}
                        >
                          Reinstate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.status === 'approved'
                ? 'Approve dealer'
                : 'Suspend dealer'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.dealer.company_name} — optional note for the
              dealer record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional internal or dealer-facing note"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmStatusChange} disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  )
}
