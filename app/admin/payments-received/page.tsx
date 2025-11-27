'use client'

import { useState, useEffect, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { DataTable } from '@/app/admin'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Copy } from 'lucide-react'
import dynamic from 'next/dynamic'
import { BackButton } from '@/components/ui/back-button'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

interface Payment {
  id: string
  user_id: string
  username: string
  email: string
  first_name: string | null
  last_name: string | null
  amount: number
  type: string
  credit_type: string | null
  stripe_payment_id: string | null
  status: string | null
  description: string | null
  created_at: string
}

// Use dynamic import with SSR disabled to prevent hydration issues
const PaymentsReceivedPageContent = dynamic(
  () => Promise.resolve(PaymentsReceivedPageComponent),
  {
    ssr: false,
  }
)

export default function PaymentsReceivedPage() {
  return <PaymentsReceivedPageContent />
}

function PaymentsReceivedPageComponent() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: 'username',
      header: 'User',
      enableSorting: true,
      cell: ({ row }) => {
        const payment = row.original
        const fullName =
          payment.first_name && payment.last_name
            ? `${payment.first_name} ${payment.last_name}`
            : payment.first_name || payment.last_name || ''

        return (
          <div className="flex flex-col">
            <div className="font-medium">{payment.username}</div>
            {fullName && (
              <div className="text-sm text-muted-foreground">{fullName}</div>
            )}
            <div className="text-sm text-muted-foreground">{payment.email}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      enableSorting: true,
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number
        return <div className="font-medium">€{amount}</div>
      },
    },

    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: ({ row }) => {
        const status = row.getValue('status') as string | null
        if (!status)
          return <span className="text-muted-foreground">Completed</span>

        const getVariant = (status: string) => {
          switch (status) {
            case 'pending':
              return 'outline'
            case 'completed':
              return 'default'
            case 'failed':
              return 'destructive'
            default:
              return 'secondary'
          }
        }

        return <Badge variant={getVariant(status)}>{status}</Badge>
      },
    },
    {
      accessorKey: 'stripe_payment_id',
      header: 'Payment ID',
      enableSorting: false,
      cell: ({ row }) => {
        const stripeId = row.getValue('stripe_payment_id') as string | null
        if (!stripeId) return <span className="text-muted-foreground">-</span>

        const copyToClipboard = () => {
          navigator.clipboard.writeText(stripeId)
          toast({
            title: 'Copied',
            description: 'Payment ID copied to clipboard',
          })
        }

        const openInStripe = () => {
          // Note: This would need proper Stripe dashboard URL construction
          window.open(
            `https://dashboard.stripe.com/payments/${stripeId}`,
            '_blank'
          )
        }

        return (
          <div className="flex items-center space-x-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {stripeId.substring(0, 15)}...
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openInStripe}
              className="h-6 w-6 p-0"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      enableSorting: false,
      cell: ({ row }) => {
        const description = row.getValue('description') as string | null
        if (!description)
          return <span className="text-muted-foreground">-</span>

        return (
          <div className="max-w-xs truncate" title={description}>
            {description}
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Date & Time',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string
        if (!date) return 'N/A'

        const dateObj = new Date(date)
        return (
          <div className="flex flex-col">
            <div className="font-medium">{format(dateObj, 'PPP')}</div>
            <div className="text-sm text-muted-foreground">
              {format(dateObj, 'p')}
            </div>
          </div>
        )
      },
    },
  ]

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/admin/payments-received', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch payments')
      }

      const data = await response.json()

      if (!data || !data.payments) {
        throw new Error('No data returned from payments API')
      }

      setPayments(data.payments)
    } catch (error) {
      console.error('Error in fetchPayments:', error)
      toast({
        variant: 'destructive',
        title: 'Error fetching payments',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to fetch payments. Please check console for more details.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return (
    <PageLayout withSpacing>
      <PageHeader
        title="Payments Received"
        description="View all payment transactions and their status"
      />
      <BackButton label="Back to Dashboard" href="/admin" />

      {isLoading ? (
        <div className="rounded-md border">
          <div className="h-24 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Loading payments...
              </div>
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={payments}
          searchKey="username"
          searchPlaceholder="Search by username..."
        />
      )}
    </PageLayout>
  )
}
