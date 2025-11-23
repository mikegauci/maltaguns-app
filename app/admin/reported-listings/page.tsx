'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, FormDialog, ConfirmDialog, ActionCell } from '@/app/admin'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BackButton } from '@/components/ui/back-button'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface ReportedListing {
  id: string
  listing_id: string
  reporter_id: string
  reason: string
  description: string | null
  created_at: string
  status: string
  listing?: {
    title: string
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

// Use dynamic import with SSR disabled to prevent hydration issues
const ReportedListingsPageContent = dynamic(
  () => Promise.resolve(ReportedListingsPageComponent),
  {
    ssr: false,
  }
)

export default function ReportedListingsPage() {
  return <ReportedListingsPageContent />
}

function ReportedListingsPageComponent() {
  const router = useRouter()
  const { toast } = useToast()
  const [reportedListings, setReportedListings] = useState<ReportedListing[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportedListing | null>(
    null
  )
  const [newStatus, setNewStatus] = useState('')
  const supabase = createClientComponentClient()

  // Helper function to create URL-friendly slugs from titles
  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
  }

  // Helper function to format reason text
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
      accessorKey: 'listing.title',
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
                    `/marketplace/listing/${slugify(listing.title)}`,
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
      accessorKey: 'listing.seller.username',
      header: 'Listing Owner',
      enableSorting: true,
      cell: ({ row }) => {
        const seller = row.original.listing?.seller
        return seller?.username || 'Unknown User'
      },
    },
    {
      accessorKey: 'reporter.username',
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

  useEffect(() => {
    fetchReportedListings()
  }, [])

  async function fetchReportedListings() {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reported Listings</h1>
        <BackButton label="Back to Dashboard" href="/admin" />
      </div>

      <DataTable
        columns={columns}
        data={isLoading ? [] : reportedListings}
        searchKey="listing.title"
        searchPlaceholder="Search by listing title..."
      />

      {isLoading && (
        <div className="w-full flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
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
    </div>
  )
}
