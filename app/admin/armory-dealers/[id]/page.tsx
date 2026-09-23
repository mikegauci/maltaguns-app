'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { ArmoryAuditTable } from '@/components/admin/armory-audit-table'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { useToast } from '@/hooks/use-toast'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import { fmtDate } from '@/lib/armory/format'
import { SHIPMENT_STATUSES } from '@/lib/armory/constants'
import type { AuditLogRow, DealerAccount, StaffRow } from '@/lib/armory/types'
import type { ShipmentRow } from '@/lib/armory/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

type ShipmentSummary = ShipmentRow & {
  itemCount: number
  firearmCount: number
}

type DealerDetail = {
  dealer: DealerAccount
  ownerEmail: string | null
  ownerName: string | null
  staff: StaffRow[]
  shipments: ShipmentSummary[]
  audit: AuditLogRow[]
}

function statusBadge(status: DealerAccount['accountStatus']) {
  if (status === 'APPROVED')
    return <Badge className="bg-green-600">Approved</Badge>
  if (status === 'SUSPENDED')
    return <Badge variant="destructive">Suspended</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

export default function ArmoryDealerDetailPage() {
  const params = useParams<{ id: string }>()
  const { toast } = useToast()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })
  const [detail, setDetail] = useState<DealerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<
    'approved' | 'suspended' | null
  >(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resettingStaffId, setResettingStaffId] = useState<string | null>(null)

  const loadDetail = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/armory-dealers/${params.id}`)
    const data = await res.json()
    if (!res.ok) {
      toast({
        title: 'Error loading dealer',
        description: data.error ?? 'Failed to load dealer',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }
    setDetail(data)
    setNote(data.dealer.statusNote ?? '')
    setLoading(false)
  }, [params.id, toast])

  useEffect(() => {
    if (!isAuthorized) return
    scheduleEffectWork(() => {
      void loadDetail()
    })
  }, [isAuthorized, loadDetail])

  async function confirmStatusChange() {
    if (!pendingStatus || !detail) return
    setSubmitting(true)
    const res = await fetch('/api/admin/armory-dealers/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: detail.dealer.id,
        status: pendingStatus,
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
    setStatusDialogOpen(false)
    setPendingStatus(null)
    loadDetail()
    window.dispatchEvent(new CustomEvent('admin-nav-badges-refresh'))
  }

  async function sendStaffReset(staffId: string) {
    setResettingStaffId(staffId)
    const res = await fetch(
      `/api/admin/armory-dealers/${params.id}/reset-staff-password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      }
    )
    const data = await res.json()
    setResettingStaffId(null)
    if (!res.ok) {
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Success', description: data.message })
  }

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  if (loading || !detail) {
    return <AdminLoadingState />
  }

  const { dealer, ownerEmail, ownerName, staff, shipments, audit } = detail

  return (
    <AdminPageLayout
      title={dealer.companyName}
      description={`Licence ${dealer.dealerLicenceNumber ?? '—'} · expires ${dealer.dealerLicenceExpiry ?? '—'} · ${ownerEmail ?? '—'}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/armory-dealers">All dealers</Link>
        </Button>
        <div className="flex items-center gap-2">
          {statusBadge(dealer.accountStatus)}
          {dealer.accountStatus !== 'APPROVED' && (
            <Button
              size="sm"
              onClick={() => {
                setPendingStatus('approved')
                setStatusDialogOpen(true)
              }}
            >
              Approve
            </Button>
          )}
          {dealer.accountStatus === 'APPROVED' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setPendingStatus('suspended')
                setStatusDialogOpen(true)
              }}
            >
              Suspend
            </Button>
          )}
          {dealer.accountStatus === 'SUSPENDED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPendingStatus('approved')
                setStatusDialogOpen(true)
              }}
            >
              Reinstate
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">
          Licence & company details as entered by the dealer
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          {[
            [
              'Contact',
              [dealer.contactFirstNames, dealer.contactSurname]
                .filter(Boolean)
                .join(' ') || null,
            ],
            ['Owner', ownerName],
            ['Date of birth', dealer.contactDateOfBirth],
            ['Passport / ID', dealer.passportIdNumber],
            ['Address', dealer.registeredAddress],
            ['Phone', dealer.phoneNumber],
            ['Licence no.', dealer.dealerLicenceNumber],
            ['Licence expiry', dealer.dealerLicenceExpiry],
            [
              'Cost allocation',
              dealer.shippingAllocationMethod.replace(/_/g, ' '),
            ],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd>{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-md border">
          <h2 className="text-sm font-medium p-4 border-b">Users</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Reset password</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    {u.name ?? '—'}
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === 'owner' ? 'default' : 'secondary'}
                    >
                      {u.role === 'owner' ? 'Owner' : 'Staff'}
                    </Badge>
                    {u.disabledAt && (
                      <Badge variant="destructive" className="ml-1">
                        disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.role === 'staff' && !u.disabledAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resettingStaffId === u.id}
                        onClick={() => sendStaffReset(u.id)}
                      >
                        {resettingStaffId === u.id
                          ? 'Sending…'
                          : 'Send reset email'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-md border">
          <h2 className="text-sm font-medium p-4 border-b">Shipments</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-6"
                  >
                    No shipments
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{s.reference}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {SHIPMENT_STATUSES.find(x => x.value === s.status)
                          ?.label ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.itemCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-md border mb-6">
        <div className="flex items-center justify-between gap-3 p-4 border-b">
          <h2 className="text-sm font-medium">Recent activity (audit log)</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/armory-audit?dealerAccountId=${dealer.id}`}>
              View all
            </Link>
          </Button>
        </div>
        <div className="p-4">
          <ArmoryAuditTable rows={audit} />
        </div>
      </div>

      <div className="rounded-md border p-4">
        <h2 className="text-sm font-medium mb-3">Status note</h2>
        <div className="space-y-2">
          <Label htmlFor="status-note">
            Visible to the dealer when suspended
          </Label>
          <Textarea
            id="status-note"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <Button
            size="sm"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true)
              const res = await fetch('/api/admin/armory-dealers/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: dealer.id,
                  status: dealer.accountStatus.toLowerCase(),
                  note: note || undefined,
                }),
              })
              const data = await res.json()
              setSubmitting(false)
              if (!res.ok) {
                toast({
                  title: 'Error',
                  description: data.error,
                  variant: 'destructive',
                })
                return
              }
              toast({ title: 'Success', description: data.message })
              loadDetail()
            }}
          >
            Save note
          </Button>
        </div>
      </div>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingStatus === 'approved'
                ? dealer.accountStatus === 'SUSPENDED'
                  ? 'Reinstate dealer'
                  : 'Approve dealer'
                : pendingStatus === 'suspended'
                  ? 'Suspend dealer'
                  : 'Update dealer note'}
            </DialogTitle>
            <DialogDescription>{dealer.companyName}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
            >
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
