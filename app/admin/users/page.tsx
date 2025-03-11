"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable } from "@/components/admin/data-table"
import { FormDialog } from "@/components/admin/form-dialog"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { ActionCell } from "@/components/admin/action-cell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import dynamic from "next/dynamic"

interface User {
  id: string
  username: string
  email: string
  created_at: string
  is_admin: boolean
  is_seller: boolean
}

// List of authorized admin emails
const AUTHORIZED_ADMIN_EMAILS = [
  "etsy@motorelement.com",
  "info@maltaguns.com"
]

// Use dynamic import with SSR disabled to prevent hydration issues
const UsersPageContent = dynamic(() => Promise.resolve(UsersPageComponent), { 
  ssr: false 
})

export default function UsersPage() {
  return <UsersPageContent />
}

function UsersPageComponent() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    is_admin: false,
    is_seller: false,
  })
  const supabase = createClientComponentClient()

  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string
        return date ? format(new Date(date), "PPP") : "N/A"
      },
    },
    {
      accessorKey: "is_admin",
      header: "Admin",
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.getValue("is_admin") ? "Yes" : "No"}
        </div>
      ),
    },
    {
      accessorKey: "is_seller",
      header: "Seller",
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.getValue("is_seller") ? "Yes" : "No"}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original
        return (
          <ActionCell
            onEdit={() => handleEdit(user)}
            onDelete={() => handleDelete(user)}
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
      const response = await fetch('/api/admin/init', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to initialize admin users')
      }
      
      // Refresh the users list
      await fetchUsers()
    } catch (error) {
      console.error('Error initializing admin users:', error)
    }
  }

  async function fetchUsers() {
    try {
      setIsLoading(true)
      
      // First check if we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
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
        userEmail: session.user.email
      })

      // Now fetch users with all fields including roles
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, email, created_at, is_admin, is_seller")
        .order("created_at", { ascending: false })

      if (error) {
        console.error('Fetch users error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      if (!data) {
        console.error('No data returned from profiles query')
        throw new Error('No data returned from profiles query')
      }

      // Check if current user should be an admin but isn't
      const currentUser = data.find(user => user.id === session.user.id)
      if (currentUser && 
          AUTHORIZED_ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) && 
          !currentUser.is_admin) {
        console.log('Initializing admin privileges for authorized user')
        await initializeAdminUsers()
        return // fetchUsers will be called again after initialization
      }

      console.log('Successfully fetched users:', {
        count: data.length,
        firstUser: data[0]
      })
      
      setUsers(data)
    } catch (error) {
      console.error('Error in fetchUsers:', error)
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: error instanceof Error 
          ? `${error.message}. Please check console for more details.` 
          : "Failed to fetch users. Please check console for more details.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleCreate() {
    setFormData({
      username: "",
      email: "",
      password: "",
      is_admin: false,
      is_seller: false,
    })
    setIsCreateDialogOpen(true)
  }

  function handleEdit(user: User) {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      is_admin: user.is_admin,
      is_seller: user.is_seller,
    })
    setIsEditDialogOpen(true)
  }

  function handleDelete(user: User) {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  async function handleCreateSubmit() {
    try {
      setIsSubmitting(true)

      // Check if trying to create an admin user with unauthorized email
      if (formData.is_admin && !AUTHORIZED_ADMIN_EMAILS.includes(formData.email.toLowerCase())) {
        throw new Error("Only specific users can be granted admin privileges")
      }

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
      if (!userId) throw new Error("User ID not found after signup.")

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          username: formData.username,
          email: formData.email,
          is_admin: formData.is_admin,
          is_seller: formData.is_seller,
        })

      if (profileError) throw profileError

      toast({
        title: "Success",
        description: "User created successfully",
      })

      setIsCreateDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditSubmit() {
    if (!selectedUser) return

    try {
      setIsSubmitting(true)

      // Check if trying to grant admin privileges to unauthorized email
      if (formData.is_admin && 
          !AUTHORIZED_ADMIN_EMAILS.includes(formData.email.toLowerCase()) &&
          (!selectedUser.is_admin || selectedUser.email !== formData.email)) {
        throw new Error("Only specific users can be granted admin privileges")
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          email: formData.email,
          is_admin: formData.is_admin,
          is_seller: formData.is_seller,
        })
        .eq("id", selectedUser.id)

      if (profileError) throw profileError

      // Update password if provided
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          selectedUser.id,
          { password: formData.password }
        )

        if (passwordError) throw passwordError
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      setIsEditDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
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
        title: "Success",
        description: "User deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      fetchUsers()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
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
          onClick={() => router.push("/admin")}
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
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_admin"
                checked={formData.is_admin}
                onCheckedChange={(checked) => setFormData({ ...formData, is_admin: checked })}
              />
              <Label htmlFor="is_admin">Admin</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_seller"
                checked={formData.is_seller}
                onCheckedChange={(checked) => setFormData({ ...formData, is_seller: checked })}
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
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
            <Input
              id="edit-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_admin"
                checked={formData.is_admin}
                onCheckedChange={(checked) => setFormData({ ...formData, is_admin: checked })}
              />
              <Label htmlFor="edit-is_admin">Admin</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_seller"
                checked={formData.is_seller}
                onCheckedChange={(checked) => setFormData({ ...formData, is_seller: checked })}
              />
              <Label htmlFor="edit-is_seller">Seller</Label>
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
    </div>
  )
} 