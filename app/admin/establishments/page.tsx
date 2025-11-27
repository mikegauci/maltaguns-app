'use client'

import { useState, useEffect, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, FormDialog, ConfirmDialog, ActionCell } from '@/app/admin'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import dynamic from 'next/dynamic'
import { Store, Building, Wrench, Target, Upload, X } from 'lucide-react'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'

interface Establishment {
  id: string
  name: string
  type: 'store' | 'club' | 'servicing' | 'range'
  owner_id: string
  ownerName: string
  ownerEmail: string
  location: string
  email: string
  phone: string
  created_at: string
  slug: string
  status: string
  logo_url: string | null
}

interface User {
  id: string
  username: string
  email: string
  first_name: string | null
  last_name: string | null
}

// Use dynamic import with SSR disabled to prevent hydration issues
const EstablishmentsPageContent = dynamic(
  () => Promise.resolve(EstablishmentsPageComponent),
  {
    ssr: false,
  }
)

export default function EstablishmentsPage() {
  return <EstablishmentsPageContent />
}

function EstablishmentsPageComponent() {
  const { toast } = useToast()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [selectedEstablishment, setSelectedEstablishment] =
    useState<Establishment | null>(null)
  const [createFormData, setCreateFormData] = useState({
    owner_id: '',
    type: '',
    name: '',
    location: '',
    email: '',
    phone: '',
    description: '',
    website: '',
    logo_url: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    type: '',
    location: '',
    logo_url: '',
  })
  const [counts, setCounts] = useState({
    stores: 0,
    clubs: 0,
    servicing: 0,
    ranges: 0,
  })
  const supabase = createClientComponentClient()

  const columns: ColumnDef<Establishment>[] = [
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
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
      cell: ({ row }) => {
        const establishment = row.original
        const logoUrl = establishment.logo_url

        return (
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={establishment.name}
                className="w-10 h-10 object-cover rounded-md"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                {getTypeIcon(establishment.type)}
              </div>
            )}
            <div className="flex flex-col">
              <div className="font-medium">{establishment.name}</div>
              <div className="text-sm text-muted-foreground">
                {establishment.slug}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: true,
      cell: ({ row }) => {
        const type = row.getValue('type') as string
        return (
          <div className="flex items-center">
            <span
              className={`px-2 py-1 rounded-full text-xs ${getTypeColor(type)}`}
            >
              {getTypeLabel(type)}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'ownerName',
      header: 'Owner',
      enableSorting: true,
      cell: ({ row }) => {
        const establishment = row.original
        return (
          <div className="flex flex-col">
            <div>{establishment.ownerName}</div>
            <div className="text-sm text-muted-foreground">
              {establishment.ownerEmail}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
      enableSorting: true,
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
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <div className="flex items-center">
            {status === 'active' ? (
              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                Active
              </span>
            ) : (
              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                Inactive
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const establishment = row.original
        return (
          <ActionCell
            onEdit={() => handleEdit(establishment)}
            onDelete={() => handleDelete(establishment)}
            extraActions={[
              {
                label: 'View Details',
                onClick: () =>
                  window.open(
                    `/establishments/${establishment.type}s/${establishment.slug}`,
                    '_blank'
                  ),
                variant: 'outline',
              },
            ]}
          />
        )
      },
    },
  ]

  const fetchUsers = useCallback(async () => {
    try {
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
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        variant: 'destructive',
        title: 'Error fetching users',
        description:
          error instanceof Error ? error.message : 'Failed to fetch users',
      })
    }
  }, [toast])

  const fetchEstablishments = useCallback(async () => {
    try {
      // Use the API endpoint to get establishments
      const response = await fetch('/api/admin/establishments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch establishments')
      }

      const data = await response.json()

      if (!data || !data.establishments) {
        console.error('No data returned from establishments API')
        throw new Error('No data returned from establishments API')
      }

      console.log('Successfully fetched establishments:', {
        count: data.establishments.length,
        firstEstablishment: data.establishments[0],
      })

      setEstablishments(data.establishments)
      setCounts(
        data.counts || {
          stores: 0,
          clubs: 0,
          servicing: 0,
          ranges: 0,
        }
      )
    } catch (error) {
      console.error('Error in fetchEstablishments:', error)
      toast({
        variant: 'destructive',
        title: 'Error fetching establishments',
        description:
          error instanceof Error
            ? `${error.message}. Please check console for more details.`
            : 'Failed to fetch establishments. Please check console for more details.',
      })
    }
  }, [toast])

  useEffect(() => {
    fetchEstablishments()
    fetchUsers()
  }, [fetchEstablishments, fetchUsers])

  // Logo upload handler
  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    isEdit = false
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // File validation
    const ACCEPTED_IMAGE_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or WebP image',
        variant: 'destructive',
      })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploadingLogo(true)

      // Get session for user ID
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user.id) {
        throw new Error('Authentication error')
      }

      // Use retailers bucket as seen in existing data
      const bucketName = 'retailers'

      // Create unique filename following existing pattern
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      const filePath = `retailers/${fileName}` // Path structure matches existing data

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(filePath)

      // Update appropriate form
      if (isEdit) {
        setEditFormData({ ...editFormData, logo_url: publicUrl })
      } else {
        setCreateFormData({ ...createFormData, logo_url: publicUrl })
      }

      toast({
        title: 'Logo uploaded',
        description: 'Logo has been uploaded successfully',
      })
    } catch (error) {
      console.error('Logo upload error:', error)
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload logo',
        variant: 'destructive',
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  // Remove logo handler
  const handleRemoveLogo = (isEdit = false) => {
    if (isEdit) {
      setEditFormData({ ...editFormData, logo_url: '' })
    } else {
      setCreateFormData({ ...createFormData, logo_url: '' })
    }
  }

  function handleCreate() {
    setCreateFormData({
      owner_id: '',
      type: '',
      name: '',
      location: '',
      email: '',
      phone: '',
      description: '',
      website: '',
      logo_url: '',
    })
    setIsCreateDialogOpen(true)
  }

  function handleEdit(establishment: Establishment) {
    setSelectedEstablishment(establishment)
    setEditFormData({
      name: establishment.name,
      type: establishment.type,
      location: establishment.location,
      logo_url: establishment.logo_url || '',
    })
    setIsEditDialogOpen(true)
  }

  function handleDelete(establishment: Establishment) {
    setSelectedEstablishment(establishment)
    setIsDeleteDialogOpen(true)
  }

  async function handleCreateSubmit() {
    try {
      setIsSubmitting(true)

      const response = await fetch('/api/admin/establishments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createFormData,
          logo_url: createFormData.logo_url || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create establishment')
      }

      toast({
        title: 'Success',
        description: result.message || 'Establishment created successfully',
      })

      setIsCreateDialogOpen(false)
      fetchEstablishments()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create establishment',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleEditSubmit() {
    if (!selectedEstablishment) return

    try {
      setIsSubmitting(true)

      // Check if the type has changed
      const typeChanged = editFormData.type !== selectedEstablishment.type

      // Use the new API endpoint for updating establishments
      const response = await fetch('/api/admin/establishments/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedEstablishment.id,
          currentType: selectedEstablishment.type,
          newType: editFormData.type,
          name: editFormData.name,
          location: editFormData.location,
          logo_url: editFormData.logo_url || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update establishment')
      }

      toast({
        title: 'Success',
        description: typeChanged
          ? `Establishment updated and moved to ${getTypeLabel(editFormData.type)}`
          : 'Establishment updated successfully',
      })

      setIsEditDialogOpen(false)
      fetchEstablishments()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update establishment',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSubmit() {
    if (!selectedEstablishment) return

    try {
      setIsSubmitting(true)

      // Determine which table to delete from based on the type
      const table = `${selectedEstablishment.type}s`

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', selectedEstablishment.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `${getTypeLabel(selectedEstablishment.type)} deleted successfully`,
      })

      setIsDeleteDialogOpen(false)
      fetchEstablishments()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete establishment',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout withSpacing>
      <PageHeader
        title="Establishment Management"
        description="Manage establishments"
      />
      <BackButton label="Back to Dashboard" href="/admin" />

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Stores</h3>
            <Store className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{counts.stores}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Clubs</h3>
            <Building className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold">{counts.clubs}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Servicing</h3>
            <Wrench className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold">{counts.servicing}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Ranges</h3>
            <Target className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold">{counts.ranges}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={establishments}
        searchKey="name"
        searchPlaceholder="Search establishments..."
        onCreateNew={handleCreate}
        createButtonText="Create Establishment"
      />

      {/* Create Establishment Dialog */}
      <FormDialog
        title="Create New Establishment"
        description="Assign an existing user as owner of a new establishment"
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-owner">Select Owner</Label>
            <Select
              value={createFormData.owner_id}
              onValueChange={value =>
                setCreateFormData({ ...createFormData, owner_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span>{user.username}</span>
                      <span className="text-sm text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-type">Establishment Type</Label>
            <div className="grid grid-cols-4 gap-2">
              <div
                className={`border rounded-md p-3 cursor-pointer ${createFormData.type === 'store' ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
                onClick={() =>
                  setCreateFormData({ ...createFormData, type: 'store' })
                }
              >
                <Store className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-center">Store</p>
              </div>
              <div
                className={`border rounded-md p-3 cursor-pointer ${createFormData.type === 'club' ? 'bg-green-50 border-green-300' : 'bg-white'}`}
                onClick={() =>
                  setCreateFormData({ ...createFormData, type: 'club' })
                }
              >
                <Building className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-xs text-center">Club</p>
              </div>
              <div
                className={`border rounded-md p-3 cursor-pointer ${createFormData.type === 'servicing' ? 'bg-orange-50 border-orange-300' : 'bg-white'}`}
                onClick={() =>
                  setCreateFormData({ ...createFormData, type: 'servicing' })
                }
              >
                <Wrench className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs text-center">Servicing</p>
              </div>
              <div
                className={`border rounded-md p-3 cursor-pointer ${createFormData.type === 'range' ? 'bg-purple-50 border-purple-300' : 'bg-white'}`}
                onClick={() =>
                  setCreateFormData({ ...createFormData, type: 'range' })
                }
              >
                <Target className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-xs text-center">Range</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-name">Business Name</Label>
            <Input
              id="create-name"
              value={createFormData.name}
              onChange={e =>
                setCreateFormData({ ...createFormData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Logo Upload Section */}
          <div className="space-y-2">
            <Label>Business Logo (optional)</Label>
            <div className="space-y-4">
              {createFormData.logo_url && (
                <div className="relative inline-block">
                  <img
                    src={createFormData.logo_url}
                    alt="Business logo preview"
                    className="w-32 h-32 object-contain rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLogo(false)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => handleLogoUpload(e, false)}
                  disabled={uploadingLogo}
                  className="cursor-pointer"
                />
                {uploadingLogo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a JPEG, PNG, or WebP image (max 5MB)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-location">Location</Label>
            <Input
              id="create-location"
              value={createFormData.location}
              onChange={e =>
                setCreateFormData({
                  ...createFormData,
                  location: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createFormData.email}
                onChange={e =>
                  setCreateFormData({
                    ...createFormData,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                value={createFormData.phone}
                onChange={e =>
                  setCreateFormData({
                    ...createFormData,
                    phone: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-website">Website (optional)</Label>
            <Input
              id="create-website"
              type="url"
              value={createFormData.website}
              onChange={e =>
                setCreateFormData({
                  ...createFormData,
                  website: e.target.value,
                })
              }
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-description">Description (optional)</Label>
            <Textarea
              id="create-description"
              value={createFormData.description}
              onChange={e =>
                setCreateFormData({
                  ...createFormData,
                  description: e.target.value,
                })
              }
              placeholder="Brief description of the establishment..."
              rows={3}
            />
          </div>
        </div>
      </FormDialog>

      {/* Edit Establishment Dialog */}
      <FormDialog
        title="Edit Establishment"
        description="Update establishment details"
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Update"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={editFormData.name}
              onChange={e =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-type">Type</Label>
            <div className="grid grid-cols-4 gap-2">
              <div
                className={`border rounded-md p-3 cursor-pointer ${editFormData.type === 'store' ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
                onClick={() =>
                  setEditFormData({ ...editFormData, type: 'store' })
                }
              >
                <Store className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-center">Store</p>
              </div>
              <div
                className={`border rounded-md p-3 cursor-pointer ${editFormData.type === 'club' ? 'bg-green-50 border-green-300' : 'bg-white'}`}
                onClick={() =>
                  setEditFormData({ ...editFormData, type: 'club' })
                }
              >
                <Building className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-xs text-center">Club</p>
              </div>
              <div
                className={`border rounded-md p-3 cursor-pointer ${editFormData.type === 'servicing' ? 'bg-orange-50 border-orange-300' : 'bg-white'}`}
                onClick={() =>
                  setEditFormData({ ...editFormData, type: 'servicing' })
                }
              >
                <Wrench className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs text-center">Servicing</p>
              </div>
              <div
                className={`border rounded-md p-3 cursor-pointer ${editFormData.type === 'range' ? 'bg-purple-50 border-purple-300' : 'bg-white'}`}
                onClick={() =>
                  setEditFormData({ ...editFormData, type: 'range' })
                }
              >
                <Target className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-xs text-center">Range</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Changing type will move this establishment to a different database
              table.
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={editFormData.location}
              onChange={e =>
                setEditFormData({ ...editFormData, location: e.target.value })
              }
              required
            />
          </div>

          {/* Logo Upload Section */}
          <div className="space-y-2">
            <Label>Business Logo (optional)</Label>
            <div className="space-y-4">
              {editFormData.logo_url && (
                <div className="relative inline-block">
                  <img
                    src={editFormData.logo_url}
                    alt="Business logo preview"
                    className="w-32 h-32 object-contain rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLogo(true)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => handleLogoUpload(e, true)}
                  disabled={uploadingLogo}
                  className="cursor-pointer"
                />
                {uploadingLogo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a JPEG, PNG, or WebP image (max 5MB)
              </p>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Delete Establishment Confirmation */}
      <ConfirmDialog
        title="Delete Establishment"
        description={`Are you sure you want to delete ${selectedEstablishment?.name}? This action cannot be undone.`}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSubmit}
        isLoading={isSubmitting}
        confirmLabel="Delete"
        variant="destructive"
      />
    </PageLayout>
  )
}

// Helper functions for type styling
function getTypeColor(type: string): string {
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

function getTypeLabel(type: string): string {
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

function getTypeIcon(type: string) {
  switch (type) {
    case 'store':
      return <Store className="h-5 w-5 text-blue-500" />
    case 'club':
      return <Building className="h-5 w-5 text-green-500" />
    case 'servicing':
      return <Wrench className="h-5 w-5 text-orange-500" />
    case 'range':
      return <Target className="h-5 w-5 text-purple-500" />
    default:
      return null
  }
}
