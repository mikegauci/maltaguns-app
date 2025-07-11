'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef, VisibilityState } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/admin/data-table'
import { FormDialog } from '@/components/admin/form-dialog'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { ActionCell } from '@/components/admin/action-cell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import dynamic from 'next/dynamic'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface Establishment {
  type: 'store' | 'club' | 'servicing' | 'range'
  name: string
}

interface User {
  id: string
  username: string
  email: string
  created_at: string
  is_admin: boolean
  is_seller: boolean
  is_verified: boolean
  license_image: string | null
  is_disabled: boolean
  first_name: string | null
  last_name: string | null
  notes: string | null
  establishments: Establishment[]
  purchasedBefore: boolean
  creditAmount: number
}

// List of authorized admin emails
const AUTHORIZED_ADMIN_EMAILS: string[] = []

// Use dynamic import with SSR disabled to prevent hydration issues
const UsersPageContent = dynamic(() => Promise.resolve(UsersPageComponent), {
  ssr: false,
})

export default function UsersPage() {
  return <UsersPageContent />
}

// Helper functions for establishment styling
function getEstablishmentColor(type: string): string {
  switch (type) {
    case 'store':
      return 'bg-blue-100 text-blue-800'
    case 'club':
      return 'bg-green-100 text-green-800'
    case 'servicing':
      return 'bg-orange-100 text-orange-800'
    case 'range':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getEstablishmentLabel(type: string): string {
  switch (type) {
    case 'store':
      return 'Store'
    case 'club':
      return 'Club'
    case 'servicing':
      return 'Servicing'
    case 'range':
      return 'Range'
    default:
      return type
  }
}

function UsersPageComponent() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [notesFormData, setNotesFormData] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    is_admin: false, // Hide is_admin column by default
  })
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    is_admin: false,
    is_seller: false,
    is_verified: false,
    license_image: null as string | null,
    is_disabled: false,
    first_name: '' as string | null,
    last_name: '' as string | null,
    notes: '' as string | null,
  })
  const supabase = createClientComponentClient()

  const columns: ColumnDef<User>[] = [
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
      accessorKey: 'username',
      header: 'Username',
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex flex-col">
            <div>{user.username}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            {user.establishments && user.establishments.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {user.establishments.map((establishment, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2 py-0.5 rounded-full ${getEstablishmentColor(establishment.type)}`}
                    title={establishment.name}
                  >
                    {getEstablishmentLabel(establishment.type)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'first_name',
      header: 'Full Name',
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original
        const firstName = user.first_name || ''
        const lastName = user.last_name || ''

        if (!firstName && !lastName) {
          return <div className="text-muted-foreground">No name provided</div>
        }

        return (
          <div className="flex flex-col">
            {firstName && <div>{firstName}</div>}
            {lastName && (
              <div className="text-sm text-muted-foreground">{lastName}</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original
        const notes = user.notes || ''

        if (!notes) {
          return <div className="text-muted-foreground">No notes</div>
        }

        return (
          <div className="max-w-[200px]">
            <div className="truncate" title={notes}>
              {notes}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string
        return date ? format(new Date(date), 'PPP') : 'N/A'
      },
    },
    {
      accessorKey: 'is_admin',
      header: 'Admin',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.getValue('is_admin') ? 'Yes' : 'No'}
        </div>
      ),
    },
    {
      accessorKey: 'is_seller',
      header: 'Seller',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.getValue('is_seller') ? 'Yes' : 'No'}
        </div>
      ),
    },
    {
      accessorKey: 'is_verified',
      header: 'Verified',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.getValue('is_verified') ? (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Yes
            </span>
          ) : row.getValue('is_seller') ? (
            <span className="flex items-center gap-1 text-amber-500">
              <AlertCircle className="h-4 w-4" />
              Pending
            </span>
          ) : (
            'N/A'
          )}
        </div>
      ),
    },
    {
      accessorKey: 'license_image',
      header: 'License',
      enableSorting: true,
      cell: ({ row }) => {
        const licenseUrl = row.getValue('license_image') as string | null
        return (
          <div className="flex items-center">
            {licenseUrl ? (
              <a
                href={licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View License
              </a>
            ) : (
              'No license'
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'purchasedBefore',
      header: 'Purchased Before?',
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex flex-col">
            <div className="flex items-center">
              {user.purchasedBefore ? (
                <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                  Yes
                </span>
              ) : (
                <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                  No
                </span>
              )}
            </div>
            {user.purchasedBefore && (
              <div className="text-sm text-muted-foreground mt-1">
                Credits: {user.creditAmount}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'is_disabled',
      header: 'Status',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.getValue('is_disabled') ? (
            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
              Disabled
            </span>
          ) : (
            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
              Active
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <ActionCell
            onEdit={() => handleEdit(user)}
            onDelete={() => handleDelete(user)}
            extraActions={[
              {
                label: 'Add/Edit Note',
                onClick: () => handleEditNotes(user),
                variant: 'outline',
              },
              {
                label: user.is_disabled ? 'Enable User' : 'Disable User',
                onClick: () => handleToggleDisabled(user),
                variant: user.is_disabled ? 'default' : 'destructive',
              },
              ...(user.is_seller
                ? [
                    {
                      label: user.is_verified
                        ? 'Unverify License'
                        : 'Verify License',
                      onClick: () => handleToggleVerification(user),
                      variant: user.is_verified ? 'destructive' : 'default',
                    },
                  ]
                : []),
            ]}
          />
        )
      },
    },
  ]

  useEffect(() => {
    fetchUsers()
  }, [])

  async function initializeAdminUsers() {
    try {
      // Use our new admin API - the users API already handles admin initialization
      await fetch('/api/admin/users', {
        method: 'GET',
      })

      // The API automatically handles admin initialization, so we just need to refresh
      fetchUsers()
    } catch (error) {
      console.error('Error initializing admin users:', error)
    }
  }

  async function fetchUsers() {
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

      console.log('Fetching users with session:', {
        userId: session.user.id,
        userEmail: session.user.email,
      })

      // Use the API instead of direct Supabase call to bypass RLS
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const data = await response.json()

      if (!data || !data.users) {
        console.error('No data returned from users API')
        throw new Error('No data returned from users API')
      }

      console.log('Successfully fetched users:', {
        count: data.users.length,
        firstUser: data.users[0],
      })

      setUsers(data.users)
    } catch (error) {
      console.error('Error in fetchUsers:', error)
      toast({
        variant: 'destructive',
        title: 'Error fetching users',
        description:
          error instanceof Error
            ? `${error.message}. Please check console for more details.`
            : 'Failed to fetch users. Please check console for more details.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleCreate() {
    setFormData({
      username: '',
      email: '',
      password: '',
      is_admin: false,
      is_seller: false,
      is_verified: false,
      license_image: null,
      is_disabled: false,
      first_name: '',
      last_name: '',
      notes: '',
    })
    setIsCreateDialogOpen(true)
  }

  function handleEdit(user: User) {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      is_admin: user.is_admin,
      is_seller: user.is_seller,
      is_verified: user.is_verified,
      license_image: user.license_image,
      is_disabled: user.is_disabled,
      first_name: user.first_name,
      last_name: user.last_name,
      notes: user.notes,
    })
    setIsEditDialogOpen(true)
  }

  function handleDelete(user: User) {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  function handleEditNotes(user: User) {
    setSelectedUser(user)
    setNotesFormData(user.notes || '')
    setIsNotesDialogOpen(true)
  }

  async function handleCreateSubmit() {
    try {
      setIsSubmitting(true)

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
          },
        },
      })

      if (authError) throw authError

      const userId = authData?.user?.id
      if (!userId) throw new Error('User ID not found after signup.')

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        is_admin: formData.is_admin,
        is_seller: formData.is_seller,
        is_disabled: formData.is_disabled,
        notes: formData.notes,
      })

      if (profileError) throw profileError

      toast({
        title: 'Success',
        description: 'User created successfully',
      })

      setIsCreateDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create user',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteLicense() {
    if (!selectedUser || !formData.license_image) return

    try {
      setIsSubmitting(true)

      // Use the API endpoint to delete the license
      const response = await fetch(`/api/users/${selectedUser.id}/license`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete license image')
      }

      // Update local state
      setFormData({
        ...formData,
        license_image: null,
        is_seller: false,
      })

      toast({
        title: 'Success',
        description: 'License image deleted successfully',
      })

      // Close the edit dialog and refresh the users list
      setIsEditDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete license image',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditSubmit() {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_admin: formData.is_admin,
          is_seller: formData.is_seller,
          is_verified: formData.is_verified,
          license_image: formData.license_image,
          is_disabled: formData.is_disabled,
          notes: formData.notes,
        })
        .eq('id', selectedUser.id)

      if (profileError) throw profileError

      // Update password if provided
      if (formData.password) {
        const { error: passwordError } =
          await supabase.auth.admin.updateUserById(selectedUser.id, {
            password: formData.password,
          })

        if (passwordError) throw passwordError
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      })

      setIsEditDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update user',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSubmit() {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      })

      setIsDeleteDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete user',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleDisabled(user: User) {
    try {
      setIsSubmitting(true)

      // Use the API endpoint to toggle the disabled status
      const response = await fetch(`/api/users/${user.id}/disable`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disabled: !user.is_disabled,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Failed to ${user.is_disabled ? 'enable' : 'disable'} user`
        )
      }

      toast({
        title: 'Success',
        description: `User ${user.is_disabled ? 'enabled' : 'disabled'} successfully`,
      })

      fetchUsers()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${user.is_disabled ? 'enable' : 'disable'} user`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleVerification(user: User) {
    try {
      setIsSubmitting(true)

      // Use the API endpoint to toggle the verification status
      const response = await fetch(`/api/users/${user.id}/verify-license`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verified: !user.is_verified,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Failed to ${user.is_verified ? 'unverify' : 'verify'} user`
        )
      }

      toast({
        title: 'Success',
        description: `User ${user.is_verified ? 'unverified' : 'verified'} successfully`,
      })

      fetchUsers()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${user.is_verified ? 'unverify' : 'verify'} user`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleNotesSubmit() {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)

      // Update notes via API
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notesFormData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update notes')
      }

      toast({
        title: 'Success',
        description: 'Notes updated successfully',
      })

      setIsNotesDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update notes',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <button
          onClick={() => router.push('/admin')}
          className="text-blue-500 hover:underline"
        >
          Back to Dashboard
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchKey="username"
        searchPlaceholder="Search users..."
        onCreateNew={handleCreate}
        createButtonText="Create User"
      />

      {/* Create User Dialog */}
      <FormDialog
        title="Create User"
        description="Add a new user to the system"
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={e =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name || ''}
                onChange={e =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name || ''}
                onChange={e =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={e =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-notes">Notes</Label>
            <Textarea
              id="create-notes"
              placeholder="Add notes about this user..."
              value={formData.notes || ''}
              onChange={e =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_admin"
                checked={formData.is_admin}
                onCheckedChange={checked =>
                  setFormData({ ...formData, is_admin: checked })
                }
              />
              <Label htmlFor="is_admin">Admin</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_seller"
                checked={formData.is_seller}
                onCheckedChange={checked =>
                  setFormData({ ...formData, is_seller: checked })
                }
              />
              <Label htmlFor="is_seller">Seller</Label>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Edit User Dialog */}
      <FormDialog
        title="Edit User"
        description="Update user information"
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Update"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={e =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first_name">First Name</Label>
              <Input
                id="edit-first_name"
                value={formData.first_name || ''}
                onChange={e =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last_name">Last Name</Label>
              <Input
                id="edit-last_name"
                value={formData.last_name || ''}
                onChange={e =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">
              Password (leave blank to keep current)
            </Label>
            <Input
              id="edit-password"
              type="password"
              value={formData.password}
              onChange={e =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          {formData.license_image && (
            <div className="space-y-2">
              <Label>License Image</Label>
              <div className="border p-2 rounded-md">
                <div className="flex flex-col gap-2">
                  <a
                    href={formData.license_image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline flex items-center gap-2"
                  >
                    <img
                      src={formData.license_image}
                      alt="License"
                      className="w-20 h-20 object-cover border rounded"
                    />
                    <span>View Full Size</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleDeleteLicense}
                    disabled={isSubmitting}
                    className="text-red-500 hover:underline text-sm flex items-center gap-1 mt-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete License Image
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              placeholder="Add notes about this user..."
              value={formData.notes || ''}
              onChange={e =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_admin"
                checked={formData.is_admin}
                onCheckedChange={checked =>
                  setFormData({ ...formData, is_admin: checked })
                }
              />
              <Label htmlFor="edit-is_admin">Admin</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_seller"
                checked={formData.is_seller}
                onCheckedChange={checked =>
                  setFormData({ ...formData, is_seller: checked })
                }
              />
              <Label htmlFor="edit-is_seller">Seller</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_verified"
                checked={formData.is_verified}
                onCheckedChange={checked =>
                  setFormData({ ...formData, is_verified: checked })
                }
              />
              <Label htmlFor="edit-is_verified">Verified</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_disabled"
                checked={formData.is_disabled}
                onCheckedChange={checked =>
                  setFormData({ ...formData, is_disabled: checked })
                }
              />
              <Label htmlFor="edit-is_disabled">Disabled</Label>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Delete User Confirmation */}
      <ConfirmDialog
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.username}? This action cannot be undone.`}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSubmit}
        isLoading={isSubmitting}
        confirmLabel="Delete"
        variant="destructive"
      />

      {/* Edit Notes Dialog */}
      <FormDialog
        title="Notes"
        description={`Edit notes for ${selectedUser?.username} user`}
        isOpen={isNotesDialogOpen}
        onClose={() => setIsNotesDialogOpen(false)}
        onSubmit={handleNotesSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Save Notes"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this user..."
              value={notesFormData}
              onChange={e => setNotesFormData(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
