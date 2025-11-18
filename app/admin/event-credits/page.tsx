'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  DataTable,
  EditEventCreditDialog,
  AddEventCreditDialog,
} from '@/app/admin'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'

interface EventCredit {
  id: string
  user_id: string
  amount: string
  created_at: string
  updated_at: string
  username?: string
  email?: string
}

function EventCreditsPageComponent() {
  const router = useRouter()
  const { toast } = useToast()
  const [eventCredits, setEventCredits] = useState<EventCredit[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedEventCredit, setSelectedEventCredit] =
    useState<EventCredit | null>(null)
  const supabase = createClientComponentClient()

  const fetchData = async () => {
    try {
      // Check if we're authenticated as admin
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Get admin status for the current user
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user?.id)
        .single()

      // Only proceed if user is admin
      if (!profileData?.is_admin) {
        toast({
          title: 'Access Denied',
          description: 'You must be an admin to view this page',
          variant: 'destructive',
        })
        router.push('/')
        return
      }

      setIsLoading(true)
      console.log('Fetching event credits data from API...')

      // Fetch data from direct API endpoint
      const response = await fetch('/api/admin/event-credits/direct')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch event credits')
      }

      const responseData = await response.json()

      // Handle the response format
      if (responseData.data && Array.isArray(responseData.data)) {
        setEventCredits(responseData.data)
      } else {
        setError('Unexpected data format received')
        setEventCredits([])
      }

      // Also fetch all profiles for the add dialog
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, username, email')
        .order('username', { ascending: true })

      if (allProfiles) {
        setProfiles(allProfiles)
      }
    } catch (error) {
      console.error('Error fetching event credits:', error)
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch event credits data'
      )
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to fetch event credits data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [supabase, toast, router])

  const handleEditEventCredit = (eventCredit: EventCredit) => {
    setSelectedEventCredit(eventCredit)
    setEditDialogOpen(true)
  }

  const handleAddEventCredit = () => {
    setAddDialogOpen(true)
  }

  const columns: ColumnDef<EventCredit>[] = [
    {
      accessorKey: 'username',
      header: 'User',
      enableSorting: true,
      cell: ({ row }) => {
        const username = row.getValue('username') as string
        const email = row.original.email
        return (
          <div className="flex flex-col">
            <span className="font-medium">{username}</span>
            {email && (
              <span className="text-sm text-muted-foreground">{email}</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'amount',
      header: 'Event Credits',
      enableSorting: true,
      cell: ({ row }) => {
        const amount = row.getValue('amount') as string
        return <span className="font-medium">{amount}</span>
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string
        return date ? format(new Date(date), 'PPP') : 'N/A'
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Last Updated',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('updated_at') as string
        return date ? format(new Date(date), 'PPP') : 'N/A'
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditEventCredit(row.original)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )
      },
    },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading event credits data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-6 bg-destructive/10 border border-destructive rounded-lg max-w-lg">
          <h2 className="text-xl font-bold text-destructive mb-4">
            Error Loading Event Credits
          </h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Event Credit Management</h1>
        <div className="flex items-center gap-6">
          <BackButton label="Back to Dashboard" href="/admin" />
          <Button onClick={handleAddEventCredit}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event Credits
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-6">
        {eventCredits.length === 0
          ? 'No event credits found.'
          : `Showing ${eventCredits.length} event credit records.`}
      </p>

      <DataTable
        columns={columns}
        data={eventCredits}
        searchKey="username"
        searchPlaceholder="Search by username..."
      />

      {selectedEventCredit && (
        <EditEventCreditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          credit={selectedEventCredit}
          onSuccess={fetchData}
        />
      )}

      <AddEventCreditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        profiles={profiles}
        onSuccess={fetchData}
      />
    </div>
  )
}

export default function EventCreditsPage() {
  return <EventCreditsPageComponent />
}
