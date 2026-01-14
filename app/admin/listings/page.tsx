'use client'

import { useState, useEffect, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, FormDialog, ConfirmDialog, ActionCell } from '@/app/admin'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { BackButton } from '@/components/ui/back-button'
import dynamic from 'next/dynamic'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

interface Listing {
  id: string
  seller_id: string
  type: string
  category: string
  subcategory: string | null
  calibre: string | null
  title: string
  description: string
  price: string
  images: string[]
  thumbnail: string
  status: string
  created_at: string
  updated_at: string
  expires_at: string
  featured: boolean
  seller?: {
    username: string
    email: string
  }
}

// Use dynamic import with SSR disabled to prevent hydration issues
const ListingsPageContent = dynamic(
  () => Promise.resolve(ListingsPageComponent),
  {
    ssr: false,
  }
)

export default function ListingsPage() {
  return <ListingsPageContent />
}

function ListingsPageComponent() {
  const { toast } = useToast()
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'non_firearms',
    category: '',
    subcategory: '',
    calibre: '',
    status: 'active',
    featured: false,
    expires_at: null as Date | null,
  })

  // Helper function to create URL-friendly slugs from titles
  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
  }

  function isListingExpired(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) return false
    const ts = Date.parse(expiresAt)
    if (Number.isNaN(ts)) return false
    return ts < Date.now()
  }

  const columns: ColumnDef<Listing>[] = [
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
      accessorKey: 'title',
      header: 'Title',
      enableSorting: true,
      cell: ({ row }) => {
        const title = row.getValue('title') as string
        const featured = row.original.featured

        return (
          <div className="flex items-center gap-2">
            {featured && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full mr-1">
                Featured
              </span>
            )}
            {title}
          </div>
        )
      },
    },
    {
      accessorKey: 'seller',
      header: 'Seller',
      enableSorting: true,
      cell: ({ row }) => {
        const seller = row.original.seller
        return seller ? seller.username : 'Unknown'
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: true,
      cell: ({ row }) => {
        const type = row.getValue('type') as string
        return type === 'firearms' ? 'Firearms' : 'Non-Firearms'
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      enableSorting: true,
      cell: ({ row }) => {
        const category = row.getValue('category') as string
        return (
          category.charAt(0).toUpperCase() +
          category.slice(1).replace(/_/g, ' ')
        )
      },
    },
    {
      accessorKey: 'price',
      header: 'Price (€)',
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const expired = isListingExpired(row.original.expires_at)
        const displayStatus = expired ? 'expired' : status

        return (
          <div
            className={`px-2 py-1 rounded-full text-xs inline-block ${
              displayStatus === 'active'
                ? 'bg-green-100 text-green-800'
                : displayStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : displayStatus === 'expired'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
            }`}
          >
            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string
        return date ? format(new Date(date), 'dd MMM yyyy') : 'N/A'
      },
    },
    {
      accessorKey: 'expires_at',
      header: 'Expires',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue('expires_at') as string
        return date ? format(new Date(date), 'dd MMM yyyy') : 'N/A'
      },
    },
    {
      accessorKey: 'thumbnail',
      header: 'Thumbnail',
      enableSorting: false,
      cell: ({ row }) => {
        const thumbnail = row.getValue('thumbnail') as string
        return thumbnail ? (
          <img
            src={thumbnail}
            alt="Thumbnail"
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          'No image'
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const listing = row.original
        return (
          <ActionCell
            onEdit={() => handleEdit(listing)}
            onDelete={() => handleDelete(listing)}
            onView={() =>
              window.open(
                `/marketplace/listing/${slugify(listing.title)}`,
                '_blank'
              )
            }
          />
        )
      },
    },
  ]

  const fetchListings = useCallback(async () => {
    try {
      setIsLoading(true)
      // Fetch via admin API (bypasses RLS so expired listings remain visible in admin)
      const response = await fetch('/api/admin/listings', { method: 'GET' })
      const json = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(json?.error || 'Failed to fetch listings')
      }

      setListings((json?.listings || []) as Listing[])
    } catch (error) {
      console.error('Error in fetchListings:', error)
      toast({
        variant: 'destructive',
        title: 'Error fetching listings',
        description:
          error instanceof Error
            ? `${error.message}. Please check console for more details.`
            : 'Failed to fetch listings. Please check console for more details.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  function handleEdit(listing: Listing) {
    setSelectedListing(listing)
    setFormData({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      type: listing.type,
      category: listing.category,
      subcategory: listing.subcategory || '',
      calibre: listing.calibre || '',
      status: listing.status,
      featured: listing.featured || false,
      expires_at: listing.expires_at ? parseISO(listing.expires_at) : null,
    })
    setIsEditDialogOpen(true)
  }

  function handleDelete(listing: Listing) {
    setSelectedListing(listing)
    setIsDeleteDialogOpen(true)
  }

  async function handleEditSubmit() {
    if (!selectedListing) return

    try {
      setIsSubmitting(true)

      // Use admin update API route (bypasses RLS for admin users)
      const response = await fetch('/api/admin/listings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: selectedListing.id,
          title: formData.title,
          description: formData.description,
          price: formData.price,
          type: formData.type,
          category: formData.category,
          subcategory: formData.subcategory || null,
          calibre: formData.calibre || null,
          status: formData.status,
          expires_at: formData.expires_at
            ? formData.expires_at.toISOString()
            : undefined,
          featured: formData.featured,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to update listing')
      }

      toast({
        title: 'Success',
        description: 'Listing updated successfully',
      })

      setIsEditDialogOpen(false)
      fetchListings()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update listing',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSubmit() {
    if (!selectedListing) return

    try {
      setIsSubmitting(true)

      // Use admin delete API route
      const response = await fetch('/api/admin/listings/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: selectedListing.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete listing')
      }

      toast({
        title: 'Success',
        description: 'Listing deleted successfully',
      })

      setIsDeleteDialogOpen(false)
      fetchListings()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete listing',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout withSpacing>
      <PageHeader title="Listing Management" description="Manage listings" />
      <BackButton label="Back to Dashboard" href="/admin" />

      <DataTable
        columns={columns}
        data={isLoading ? [] : listings}
        searchKey="title"
        searchPlaceholder="Search listings..."
      />
      {isLoading && (
        <div className="w-full flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Edit Listing Dialog */}
      <FormDialog
        title="Edit Listing"
        description="Update listing information"
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Update"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={e =>
                setFormData(prev => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={e =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              required
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (€)</Label>
              <Input
                id="edit-price"
                value={formData.price}
                onChange={e =>
                  setFormData(prev => ({ ...prev, price: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firearms">Firearms</SelectItem>
                  <SelectItem value="non_firearms">Non-Firearms</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={e =>
                  setFormData(prev => ({ ...prev, category: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-subcategory">Subcategory (optional)</Label>
              <Input
                id="edit-subcategory"
                value={formData.subcategory}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    subcategory: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-calibre">Calibre (optional)</Label>
              <Input
                id="edit-calibre"
                value={formData.calibre}
                onChange={e =>
                  setFormData(prev => ({ ...prev, calibre: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="edit-featured"
              checked={formData.featured}
              onCheckedChange={checked =>
                setFormData(prev => ({ ...prev, featured: checked }))
              }
            />
            <Label htmlFor="edit-featured">Featured Listing</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-expires">Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.expires_at && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expires_at ? (
                    format(formData.expires_at, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.expires_at || undefined}
                  onSelect={date =>
                    setFormData(prev => ({ ...prev, expires_at: date || null }))
                  }
                  initialFocus
                  disabled={date => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </FormDialog>

      {/* Delete Listing Confirmation */}
      <ConfirmDialog
        title="Delete Listing"
        description={`Are you sure you want to delete "${selectedListing?.title}"? This action cannot be undone.`}
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
