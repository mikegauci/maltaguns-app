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
import { Store, Building, Wrench, Target } from "lucide-react"

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

// Use dynamic import with SSR disabled to prevent hydration issues
const EstablishmentsPageContent = dynamic(() => Promise.resolve(EstablishmentsPageComponent), { 
  ssr: false 
})

export default function EstablishmentsPage() {
  return <EstablishmentsPageContent />
}

function EstablishmentsPageComponent() {
  const router = useRouter()
  const { toast } = useToast()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    type: "",
    location: "",
  })
  const [counts, setCounts] = useState({
    stores: 0,
    clubs: 0,
    servicing: 0,
    ranges: 0
  })
  const supabase = createClientComponentClient()

  const columns: ColumnDef<Establishment>[] = [
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
      accessorKey: "name",
      header: "Name",
      enableSorting: true,
      cell: ({ row }) => {
        const establishment = row.original;
        const logoUrl = establishment.logo_url;
        
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
              <div className="text-sm text-muted-foreground">{establishment.slug}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      enableSorting: true,
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <div className="flex items-center">
            <span 
              className={`px-2 py-1 rounded-full text-xs ${getTypeColor(type)}`}
            >
              {getTypeLabel(type)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "ownerName",
      header: "Owner",
      enableSorting: true,
      cell: ({ row }) => {
        const establishment = row.original;
        return (
          <div className="flex flex-col">
            <div>{establishment.ownerName}</div>
            <div className="text-sm text-muted-foreground">{establishment.ownerEmail}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      enableSorting: true,
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return date ? format(new Date(date), "PPP") : "N/A";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="flex items-center">
            {status === "active" ? (
              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>
            ) : (
              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Inactive</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const establishment = row.original;
        return (
          <ActionCell
            onEdit={() => handleEdit(establishment)}
            onDelete={() => handleDelete(establishment)}
            extraActions={[
              {
                label: "View Details",
                onClick: () => window.open(`/${establishment.type}s/${establishment.slug}`, '_blank'),
                variant: "outline"
              }
            ]}
          />
        );
      },
    },
  ];

  useEffect(() => {
    fetchEstablishments();
  }, []);

  async function fetchEstablishments() {
    try {
      setIsLoading(true);
      
      // Use the API endpoint to get establishments
      const response = await fetch('/api/admin/establishments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch establishments');
      }
      
      const data = await response.json();
      
      if (!data || !data.establishments) {
        console.error('No data returned from establishments API');
        throw new Error('No data returned from establishments API');
      }

      console.log('Successfully fetched establishments:', {
        count: data.establishments.length,
        firstEstablishment: data.establishments[0]
      });
      
      setEstablishments(data.establishments);
      setCounts(data.counts || {
        stores: 0,
        clubs: 0,
        servicing: 0,
        ranges: 0
      });
    } catch (error) {
      console.error('Error in fetchEstablishments:', error);
      toast({
        variant: "destructive",
        title: "Error fetching establishments",
        description: error instanceof Error 
          ? `${error.message}. Please check console for more details.` 
          : "Failed to fetch establishments. Please check console for more details.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(establishment: Establishment) {
    setSelectedEstablishment(establishment);
    setEditFormData({
      name: establishment.name,
      type: establishment.type,
      location: establishment.location,
    });
    setIsEditDialogOpen(true);
  }

  function handleDelete(establishment: Establishment) {
    setSelectedEstablishment(establishment);
    setIsDeleteDialogOpen(true);
  }

  async function handleEditSubmit() {
    if (!selectedEstablishment) return;

    try {
      setIsSubmitting(true);
      
      // Check if the type has changed
      const typeChanged = editFormData.type !== selectedEstablishment.type;
      
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
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update establishment');
      }

      toast({
        title: "Success",
        description: typeChanged 
          ? `Establishment updated and moved to ${getTypeLabel(editFormData.type)}`
          : "Establishment updated successfully",
      });

      setIsEditDialogOpen(false);
      fetchEstablishments();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update establishment",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSubmit() {
    if (!selectedEstablishment) return;

    try {
      setIsSubmitting(true);

      // Determine which table to delete from based on the type
      const table = `${selectedEstablishment.type}s`;
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', selectedEstablishment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${getTypeLabel(selectedEstablishment.type)} deleted successfully`,
      });

      setIsDeleteDialogOpen(false);
      fetchEstablishments();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete establishment",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Establishment Management</h1>
        <button
          onClick={() => router.push("/admin")}
          className="text-blue-500 hover:underline"
        >
          Back to Dashboard
        </button>
      </div>

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
      />

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
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-type">Type</Label>
            <div className="grid grid-cols-4 gap-2">
              <div className={`border rounded-md p-3 cursor-pointer ${editFormData.type === 'store' ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
                onClick={() => setEditFormData({ ...editFormData, type: 'store' })}>
                <Store className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-center">Store</p>
              </div>
              <div className={`border rounded-md p-3 cursor-pointer ${editFormData.type === 'club' ? 'bg-green-50 border-green-300' : 'bg-white'}`}
                onClick={() => setEditFormData({ ...editFormData, type: 'club' })}>
                <Building className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-xs text-center">Club</p>
              </div>
              <div className={`border rounded-md p-3 cursor-pointer ${editFormData.type === 'servicing' ? 'bg-orange-50 border-orange-300' : 'bg-white'}`}
                onClick={() => setEditFormData({ ...editFormData, type: 'servicing' })}>
                <Wrench className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs text-center">Servicing</p>
              </div>
              <div className={`border rounded-md p-3 cursor-pointer ${editFormData.type === 'range' ? 'bg-purple-50 border-purple-300' : 'bg-white'}`}
                onClick={() => setEditFormData({ ...editFormData, type: 'range' })}>
                <Target className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-xs text-center">Range</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Changing type will move this establishment to a different database table.
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={editFormData.location}
              onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
              required
            />
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
    </div>
  );
}

// Helper functions for type styling
function getTypeColor(type: string): string {
  switch (type) {
    case 'store':
      return 'bg-blue-100 text-blue-800';
    case 'club':
      return 'bg-green-100 text-green-800';
    case 'servicing':
      return 'bg-orange-100 text-orange-800';
    case 'range':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'store':
      return 'Store';
    case 'club':
      return 'Club';
    case 'servicing':
      return 'Servicing';
    case 'range':
      return 'Range';
    default:
      return type;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'store':
      return <Store className="h-5 w-5 text-blue-500" />;
    case 'club':
      return <Building className="h-5 w-5 text-green-500" />;
    case 'servicing':
      return <Wrench className="h-5 w-5 text-orange-500" />;
    case 'range':
      return <Target className="h-5 w-5 text-purple-500" />;
    default:
      return null;
  }
} 