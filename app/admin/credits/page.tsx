'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Plus, Edit } from 'lucide-react'
import {
  DataTable,
  AdminPageLayout,
  AdminLoadingState,
  AdminErrorState,
  AdminDataCount,
  EditCreditDialog,
  AddCreditDialog,
} from '@/app/admin'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'

interface Credit {
  id: string
  user_id: string
  amount: string
  created_at: string
  updated_at: string
  username?: string
  email?: string
}

function CreditsPageComponent() {
  const router = useRouter()
  const { toast } = useToast()
  const [credits, setCredits] = useState<Credit[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null)
  const supabase = createClientComponentClient()

  const fetchData = useCallback(async () => {
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
      console.log('Fetching credits data from API...')

      // Fetch data from direct API endpoint
      const response = await fetch('/api/admin/credits/direct')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch credits')
      }

      const responseData = await response.json()
      console.log('API response:', responseData)

      // Handle the response format
      if (responseData.data && Array.isArray(responseData.data)) {
        setCredits(responseData.data)
      } else {
        setError('Unexpected data format received')
        setCredits([])
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
      console.error('Error fetching credits:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to fetch credits data'
      )
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to fetch credits data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, toast, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEditCredit = (credit: Credit) => {
    setSelectedCredit(credit)
    setEditDialogOpen(true)
  }

  const handleAddCredit = () => {
    setAddDialogOpen(true)
  }

  const columns: ColumnDef<Credit>[] = [
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
      header: 'Credits',
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
            onClick={() => handleEditCredit(row.original)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )
      },
    },
  ]

  if (isLoading) {
    return <AdminLoadingState message="Loading credits data..." />
  }

  if (error) {
    return (
      <AdminErrorState
        title="Error Loading Credits"
        message={error}
        onRetry={() => router.refresh()}
      />
    )
  }

  return (
    <PageLayout withSpacing>
      <PageHeader title="Credit Management" description="Manage user credits" />
      <div className="flex justify-center">
        <Button onClick={handleAddCredit}>
          <Plus className="h-4 w-4 mr-2" />
          Add Credit
        </Button>
      </div>
      <BackButton label="Back to Dashboard" href="/admin" />

      <AdminDataCount
        count={credits.length}
        singularLabel="credit record"
        pluralLabel="credit records"
      />

      <DataTable
        columns={columns}
        data={credits}
        searchKey="username"
        searchPlaceholder="Search by username..."
      />

      {selectedCredit && (
        <EditCreditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          credit={selectedCredit}
          onSuccess={fetchData}
        />
      )}

      <AddCreditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        profiles={profiles}
        onSuccess={fetchData}
      />
      </PageLayout>
  )
}

export default function CreditsPage() {
  return <CreditsPageComponent />
}