"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { ArrowLeft } from "lucide-react"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 6
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

const firearmsCategories = {
  "airguns": "Airguns",
  "revolvers": "Revolvers",
  "pistols": "Pistols",
  "rifles": "Rifles",
  "carbines": "Carbines",
  "shotguns": "Shotguns",
  "black_powder": "Black powder",
  "replica_deactivated": "Replica or Deactivated",
  "crossbow": "Crossbow",
  "schedule_1": "Schedule 1 (automatic)"
} as const

const nonFirearmsCategories = {
  "airsoft": "Airsoft",
  "reloading": "Reloading",
  "militaria": "Militaria",
  "accessories": "Accessories"
} as const

const subcategories = {
  "airsoft": {
    "airsoft_guns": "Airsoft Guns",
    "bbs_co2": "BBs & CO2",
    "batteries_electronics": "Batteries & Electronics",
    "clothing": "Clothing",
    "other": "Other"
  },
  "reloading": {
    "presses": "Presses",
    "dies": "Dies",
    "tools": "Tools",
    "tumblers_media": "Tumblers & Media",
    "primers_heads": "Primers & Heads",
    "other": "Other"
  },
  "militaria": {
    "uniforms": "Uniforms",
    "helmets": "Helmets",
    "swords_bayonets_knives": "Swords, Bayonets & Knives",
    "medals_badges": "Medals & Badges",
    "other": "Other"
  },
  "accessories": {
    "cleaning_maintenance": "Cleaning & Maintenance",
    "bipods_stands": "Bipods & Stands",
    "slings_holsters": "Slings & Holsters",
    "scopes_sights_optics": "Scopes, Sights & Optics",
    "magazines": "Magazines",
    "books_manuals": "Books & Manuals",
    "hunting_equipment": "Hunting Equipment",
    "safes_cabinets": "Safes & Cabinets",
    "ammo_boxes": "Ammo Boxes",
    "gun_cases": "Gun Cases",
    "safety_equipment": "Safety Equipment",
    "grips": "Grips",
    "other": "Other"
  }
} as const

// Helper function to slugify text
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
}

const listingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().min(1, "Price must be at least €1"),
  type: z.enum(["firearms", "non_firearms"]),
  category: z.string().min(1, "Please select a category"),
  subcategory: z.string().optional(),
  calibre: z.string().optional(),
})

type ListingForm = z.infer<typeof listingSchema>

export default function EditListing({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [listingId, setListingId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<"firearms" | "non_firearms" | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      type: "firearms",
      category: "",
      subcategory: "",
      calibre: "",
    },
  })

  useEffect(() => {
    async function loadListing() {
      setIsLoading(true)
      
      try {
        // Fetch all listings and filter by slug
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .filter('title', 'ilike', `%${params.slug.replace(/-/g, ' ')}%`);

        if (error || !data || data.length === 0) {
          toast({
            title: "Error",
            description: "Listing not found",
            variant: "destructive",
          })
          router.push("/marketplace")
          return
        }

        // Find the best match by comparing the slugified title with the provided slug
        const listing = data.find(item => {
          const itemSlug = slugify(item.title);
          return itemSlug === params.slug || itemSlug.includes(params.slug);
        }) || data[0];

        // Check if the user is the owner of the listing
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session?.user?.id || session.session.user.id !== listing.seller_id) {
          toast({
            title: "Unauthorized",
            description: "You don't have permission to edit this listing",
            variant: "destructive",
          })
          router.push("/marketplace")
          return
        }

        setListingId(listing.id)
        setSelectedType(listing.type)
        setSelectedCategory(listing.category)
        setExistingImages(listing.images || [])

        // Set form values
        form.reset({
          title: listing.title,
          description: listing.description,
          price: listing.price,
          type: listing.type,
          category: listing.category,
          subcategory: listing.subcategory || "",
          calibre: listing.calibre || "",
        })

        // Create preview URLs for existing images
        const previews = (listing.images || []).map((url: string) => url)
        setPreviewUrls(previews)
      } catch (error) {
        console.error("Error loading listing:", error)
        toast({
          title: "Error",
          description: "Failed to load listing",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadListing()
  }, [params.slug, router, toast, form])

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    const totalImages = existingImages.length - imagesToDelete.length + newImages.length + files.length
    if (totalImages > MAX_FILES) {
      toast({
        title: "Too many images",
        description: `You can upload a maximum of ${MAX_FILES} images`,
        variant: "destructive",
      })
      return
    }

    const newFilesArray = Array.from(files)
    const validFiles = newFilesArray.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB`,
          variant: "destructive",
        })
        return false
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image type`,
          variant: "destructive",
        })
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Add new files to state
    setNewImages(prev => [...prev, ...validFiles])

    // Create preview URLs for new files
    const newPreviews = await Promise.all(
      validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(reader.result as string)
          }
          reader.readAsDataURL(file)
        })
      })
    )

    setPreviewUrls(prev => [...prev, ...newPreviews])
  }

  function handleRemoveImage(index: number) {
    if (index < existingImages.length) {
      // It's an existing image
      const imageUrl = existingImages[index]
      setImagesToDelete(prev => [...prev, imageUrl])
      setPreviewUrls(prev => prev.filter((_, i) => i !== index))
    } else {
      // It's a new image
      const newIndex = index - existingImages.length
      setNewImages(prev => prev.filter((_, i) => i !== newIndex))
      setPreviewUrls(prev => prev.filter((_, i) => i !== index))
    }
  }

  async function onSubmit(data: ListingForm) {
    if (!listingId) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 1. Upload new images
      const uploadedImageUrls: string[] = []
      
      if (newImages.length > 0) {
        for (let i = 0; i < newImages.length; i++) {
          const file = newImages[i]
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
          const filePath = `listings/${listingId}/${fileName}`
          
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file)
            
          if (uploadError) throw uploadError
          
          const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath)
          uploadedImageUrls.push(urlData.publicUrl)
          
          // Update progress
          setUploadProgress(Math.round(((i + 1) / newImages.length) * 50))
        }
      } else {
        setUploadProgress(50)
      }
      
      // 2. Delete images marked for deletion
      if (imagesToDelete.length > 0) {
        for (const imageUrl of imagesToDelete) {
          const path = imageUrl.split('/').slice(-2).join('/')
          await supabase.storage.from('images').remove([path])
        }
      }
      
      // 3. Combine remaining existing images with new uploaded images
      const remainingExistingImages = existingImages.filter(url => !imagesToDelete.includes(url))
      const allImages = [...remainingExistingImages, ...uploadedImageUrls]
      
      // 4. Update the listing in the database
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          title: data.title,
          description: data.description,
          price: data.price,
          type: data.type,
          category: data.category,
          subcategory: data.subcategory || null,
          calibre: data.calibre || null,
          images: allImages,
          thumbnail: allImages[0] || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listingId)
      
      if (updateError) throw updateError
      
      setUploadProgress(100)
      
      toast({
        title: "Success",
        description: "Listing updated successfully",
      })
      
      // Redirect to the listing page
      router.push(`/marketplace/listing/${slugify(data.title)}`)
    } catch (error) {
      console.error('Error updating listing:', error)
      toast({
        title: "Error",
        description: "Failed to update listing",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container py-10">
      <Button 
        variant="ghost" 
        className="mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Listing</CardTitle>
          <CardDescription>
            Update your listing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter listing title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your item in detail" 
                          className="min-h-32"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        disabled={isUploading}
                        onValueChange={(value: "firearms" | "non_firearms") => {
                          field.onChange(value)
                          setSelectedType(value)
                          form.setValue("category", "")
                          form.setValue("subcategory", "")
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="firearms">Firearms</SelectItem>
                          <SelectItem value="non_firearms">Non-Firearms</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        disabled={!selectedType || isUploading}
                        onValueChange={(value) => {
                          field.onChange(value)
                          setSelectedCategory(value)
                          form.setValue("subcategory", "")
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedType === "firearms" ? (
                            Object.entries(firearmsCategories).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))
                          ) : selectedType === "non_firearms" ? (
                            Object.entries(nonFirearmsCategories).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))
                          ) : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedType === "non_firearms" && selectedCategory && subcategories[selectedCategory as keyof typeof subcategories] && (
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory</FormLabel>
                        <Select
                          disabled={isUploading}
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subcategory" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(subcategories[selectedCategory as keyof typeof subcategories]).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {selectedType === "firearms" && (
                  <FormField
                    control={form.control}
                    name="calibre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calibre</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. 9mm, .22LR, 12 gauge" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <div className="space-y-4">
                  <div>
                    <FormLabel>Images</FormLabel>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload up to {MAX_FILES} images. First image will be used as thumbnail.
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                          <img 
                            src={url} 
                            alt={`Preview ${index}`} 
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => handleRemoveImage(index)}
                            disabled={isUploading}
                          >
                            ✕
                          </Button>
                          {index === 0 && (
                            <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                              Thumbnail
                            </span>
                          )}
                        </div>
                      ))}
                      
                      {previewUrls.length < MAX_FILES && (
                        <label className="border border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer aspect-square hover:bg-muted/50 transition-colors">
                          <span className="text-2xl mb-1">+</span>
                          <span className="text-xs text-center text-muted-foreground px-2">Add Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {isUploading && (
                    <div className="w-full bg-muted rounded-full h-2.5 mb-4">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isUploading}
                  >
                    {isUploading ? "Updating..." : "Update Listing"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 