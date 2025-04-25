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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import dynamic from "next/dynamic"

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
  seller?: {
    username: string
    email: string
  }
}

// Use dynamic import with SSR disabled to prevent hydration issues
const ListingsPageContent = dynamic(() => Promise.resolve(ListingsPageComponent), { 
  ssr: false 
})

export default function ListingsPage() {
  return <ListingsPageContent />
}

function ListingsPageComponent() {
  const router = useRouter()
  const { toast } = useToast()
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    type: "non_firearms",
    category: "",
    subcategory: "",
    calibre: "",
    status: "active",
  })
  const supabase = createClientComponentClient()

  const columns: ColumnDef<Listing>[] = [
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
      accessorKey: "title",
      header: "Title",
      enableSorting: true,
    },
    {
      accessorKey: "seller",
      header: "Seller",
      enableSorting: true,
      cell: ({ row }) => {
        const seller = row.original.seller
        return seller ? seller.username : "Unknown"
      }
    },
    {
      accessorKey: "type",
      header: "Type",
      enableSorting: true,
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return type === "firearms" ? "Firearms" : "Non-Firearms"
      }
    },
    {
      accessorKey: "category",
      header: "Category",
      enableSorting: true,
      cell: ({ row }) => {
        const category = row.getValue("category") as string
        return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')
      }
    },
    {
      accessorKey: "price",
      header: "Price (€)",
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <div className={`px-2 py-1 rounded-full text-xs inline-block ${
            status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : status === 'pending' 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        )
      }
    },
    {
      accessorKey: "created_at",
      header: "Created",
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string
        return date ? format(new Date(date), "dd MMM yyyy") : "N/A"
      },
    },
    {
      accessorKey: "expires_at",
      header: "Expires",
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue("expires_at") as string
        return date ? format(new Date(date), "dd MMM yyyy") : "N/A"
      },
    },
    {
      accessorKey: "thumbnail",
      header: "Thumbnail",
      enableSorting: false,
      cell: ({ row }) => {
        const thumbnail = row.getValue("thumbnail") as string
        return thumbnail ? (
          <img 
            src={thumbnail} 
            alt="Thumbnail" 
            className="w-12 h-12 object-cover rounded"
          />
        ) : "No image"
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const listing = row.original
        return (
          <ActionCell
            onEdit={() => handleEdit(listing)}
            onDelete={() => handleDelete(listing)}
            onView={() => window.open(`/listings/${listing.id}`, '_blank')}
          />
        )
      },
    },
  ]

  useEffect(() => {
    fetchListings()
  }, [])

  async function fetchListings() {
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

      // Fetch listings with seller information
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          seller:seller_id(username, email)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error('Fetch listings error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      if (!data) {
        console.error('No data returned from listings query')
        throw new Error('No data returned from listings query')
      }

      console.log('Successfully fetched listings:', {
        count: data.length,
        firstListing: data[0]
      })
      
      setListings(data)
    } catch (error) {
      console.error('Error in fetchListings:', error)
      toast({
        variant: "destructive",
        title: "Error fetching listings",
        description: error instanceof Error 
          ? `${error.message}. Please check console for more details.` 
          : "Failed to fetch listings. Please check console for more details.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(listing: Listing) {
    setSelectedListing(listing)
    setFormData({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      type: listing.type,
      category: listing.category,
      subcategory: listing.subcategory || "",
      calibre: listing.calibre || "",
      status: listing.status,
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

      // Update listing
      const { error } = await supabase
        .from("listings")
        .update({
          title: formData.title,
          description: formData.description,
          price: formData.price,
          type: formData.type,
          category: formData.category,
          subcategory: formData.subcategory || null,
          calibre: formData.calibre || null,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedListing.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Listing updated successfully",
      })

      setIsEditDialogOpen(false)
      fetchListings()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update listing",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSubmit() {
    if (!selectedListing) return

    try {
      setIsSubmitting(true)

      // Delete listing
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", selectedListing.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Listing deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      fetchListings()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete listing",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Listing Management</h1>
        <button
          onClick={() => router.push("/admin")}
          className="text-blue-500 hover:underline"
        >
          Back to Dashboard
        </button>
      </div>

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
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
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
                onValueChange={(value) => setFormData({ ...formData, type: value })}
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
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-calibre">Calibre (optional)</Label>
              <Input
                id="edit-calibre"
                value={formData.calibre}
                onChange={(e) => setFormData({ ...formData, calibre: e.target.value })}
              />
            </div>
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
    </div>
  )
} 