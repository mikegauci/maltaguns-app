'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminDataTable as DataTable } from '@/app/admin/components/AdminDataTable'
import { listingPublicPath } from '@/lib/listing-slug'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { FormDialog } from '@/app/admin/components/FormDialog'
import { ConfirmDialog } from '@/app/admin/components/ConfirmDialog'
import { ActionCell } from '@/app/admin/components/ActionCell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Badge } from '@/components/ui/badge'
import { AdminTableLoader } from '@/components/admin/AdminTableLoader'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'

interface ReportedListing {
  id: string
  listing_id: string
  reporter_id: string
  reason: string
  description: string | null
  created_at: string
  status: string
  listing?: {
    id?: string
    title: string
    slug?: string
    seller_id: string
    status: string
    seller?: {
      username: string
      email: string
    }
  }
  reporter?: {
    username: string
    email: string
  }
}

export default ReportedListingsPageComponent

function ReportedListingsPageComponent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })
  const [reportedListings, setReportedListings] = useState<ReportedListing[]>(
    []
  )
  const pendingReportsFilter = searchParams.get('status') === 'pending'
  const displayedReports = useMemo(() => {
    if (!pendingReportsFilter) {
      return reportedListings
    }

    return reportedListings.filter(report => report.status === 'pending')
  }, [pendingReportsFilter, reportedListings])
  const [isLoading, setIsLoading] = useState(true)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportedListing | null>(
    null
  )
  const [newStatus, setNewStatus] = useState('')
  const { supabase } = useSupabase()

  function formatReason(reason: string): string {
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const columns: ColumnDef<ReportedListing>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'listingTitle',
      accessorFn: row => row.listing?.title ?? '',
      header: 'Listing Title',
      enableSorting: true,
      cell: ({ row }) => {
        const listing = row.original.listing
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {listing?.title || 'Unknown Listing'}
            </span>
            {listing?.title && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(
                    listingPublicPath({
                      slug: listing.slug,
                      title: listing.title,
                      id: listing.id || row.original.listing_id,
                    }),
                    '_blank'
                  )
                }
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      },
    },
    {
      id: 'listingOwner',
      accessorFn: row => row.listing?.seller?.username ?? '',
      header: 'Listing Owner',
      enableSorting: true,
      cell: ({ row }) => {
        const seller = row.original.listing?.seller
        return seller?.username || 'Unknown User'
      },
    },
    {
      id: 'reporter',
      accessorFn: row => row.reporter?.username ?? '',
      header: 'Reporter',
      enableSorting: true,
      cell: ({ row }) => {
        const reporter = row.original.reporter
        return reporter?.username || 'Unknown User'
      },
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      enableSorting: true,
      cell: ({ row }) => {
        const reason = row.getValue('reason') as string
        return formatReason(reason)
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      enableSorting: false,
      cell: ({ row }) => {
        const description = row.getValue('description') as string | null
        return description ? (
          <div className="max-w-xs truncate" title={description}>
            {description}
          </div>
        ) : (
          <span className="text-muted-foreground">No description</span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge
            variant={
              status === 'pending'
                ? 'secondary'
                : status === 'resolved'
                  ? 'default'
                  : status === 'dismissed'
                    ? 'outline'
                    : 'destructive'
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Reported',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string
        return date ? format(new Date(date), 'dd MMM yyyy, HH:mm') : 'N/A'
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const report = row.original
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange(report)}
            >
              Update Status
            </Button>
            <ActionCell onDelete={() => handleDelete(report)} />
          </div>
        )
      },
    },
  ]

  const fetchReportedListings = useCallback(async () => {
    try {
      setIsLoading(true)

      // First check if we have a valid session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Failed to get session')
      }

      if (!session) {
        console.error('No session found')
        throw new Error('No active session')
      }

      // Fetch reported listings with related data
      const { data, error } = await supabase
        .from('reported_listings')
        .select(
          `
           *,
           listing:listing_id(title, seller_id, status, seller:seller_id(username, email)),
           reporter:reporter_id(username, email)
         `
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch reported listings error:', error)
        throw error
      }

      if (!data) {
        console.error('No data returned from reported listings query')
        throw new Error('No data returned from reported listings query')
      }

      console.log('Successfully fetched reported listings:', {
        count: data.length,
        firstReport: data[0],
      })

      setReportedListings(data)
    } catch (error) {
      console.error('Error in fetchReportedListings:', error)
      toast({
        variant: 'destructive',
        title: 'Error fetching reported listings',
        description:
          error instanceof Error
            ? `${error.message}. Please check console for more details.`
            : 'Failed to fetch reported listings. Please check console for more details.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    if (!isAuthorized) return
    scheduleEffectWork(() => {
      fetchReportedListings()
    })
  }, [fetchReportedListings, isAuthorized])

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState message="Checking authorization..." />
  }

  function handleStatusChange(report: ReportedListing) {
    setSelectedReport(report)
    setNewStatus(report.status)
    setIsStatusDialogOpen(true)
  }

  function handleDelete(report: ReportedListing) {
    setSelectedReport(report)
    setIsDeleteDialogOpen(true)
  }

  async function handleStatusUpdate() {
    if (!selectedReport) return

    try {
      setIsSubmitting(true)

      const { error } = await supabase
        .from('reported_listings')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedReport.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Report status updated successfully',
      })

      setIsStatusDialogOpen(false)
      fetchReportedListings()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update status',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSubmit() {
    if (!selectedReport) return

    try {
      setIsSubmitting(true)

      const { error } = await supabase
        .from('reported_listings')
        .delete()
        .eq('id', selectedReport.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      })

      setIsDeleteDialogOpen(false)
      fetchReportedListings()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete report',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminPageLayout
      title="Reported Listings"
      description="View all reported listings"
    >
      {pendingReportsFilter && (
        <p className="mb-4 text-sm text-muted-foreground">
          Showing open reports only.{' '}
          <Link
            href="/admin/reported-listings"
            className="text-primary underline-offset-4 hover:underline"
          >
            Clear filter
          </Link>
        </p>
      )}
      {isLoading ? (
        <AdminTableLoader />
      ) : (
        <DataTable
          columns={columns}
          data={displayedReports}
          searchKey="listingTitle"
          searchPlaceholder="Search by listing title..."
        />
      )}

      {/* Status Update Dialog */}
      <FormDialog
        title="Update Report Status"
        description="Change the status of this report"
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onSubmit={handleStatusUpdate}
        isSubmitting={isSubmitting}
        submitLabel="Update Status"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        title="Delete Report"
        description={`Are you sure you want to delete this report? This action cannot be undone.`}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSubmit}
        isLoading={isSubmitting}
        variant="destructive"
      />
    </AdminPageLayout>
  )
}
