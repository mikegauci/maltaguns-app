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

const listingSchema = z.object({
  type: z.enum(["firearms", "non_firearms"]),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  calibre: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must not exceed 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must not exceed 2000 characters"),
  price: z.number().min(0, "Price must be a positive number"),
  images: z.array(z.string()).min(1, "At least one image is required").max(MAX_FILES, `Maximum ${MAX_FILES} images allowed`)
})

type ListingForm = z.infer<typeof listingSchema>

export default function EditListing({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  const form = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      type: "firearms",
      category: "",
      subcategory: "",
      calibre: "",
      title: "",
      description: "",
      price: 0,
      images: []
    }
  })

  useEffect(() => {
    async function loadListing() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session?.user) {
          router.push("/login")
          return
        }

        const { data: listing, error } = await supabase
          .from("listings")
          .select("*")
          .eq("id", params.id)
          .single()

        if (error) throw error

        if (listing.seller_id !== sessionData.session.user.id) {
          toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You can only edit your own listings.",
          })
          router.push("/profile")
          return
        }

        setSelectedCategory(listing.category)
        setUploadedImages(listing.images)

        form.reset({
          type: listing.type,
          category: listing.category,
          subcategory: listing.subcategory || "",
          calibre: listing.calibre || "",
          title: listing.title,
          description: listing.description,
          price: listing.price,
          images: listing.images
        })
      } catch (error) {
        console.error("Error loading listing:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load listing details.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadListing()
  }, [params.id, router, form, toast])

  // Watch for category changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "category") {
        setSelectedCategory(value.category || "")
        // Reset subcategory when category changes
        if (value.type === "non_firearms") {
          form.setValue("subcategory", "")
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const files = Array.from(event.target.files || [])
      
      if (files.length + uploadedImages.length > MAX_FILES) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: `Maximum ${MAX_FILES} images allowed`
        })
        return
      }

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          toast({
            variant: "destructive",
            title: "File too large",
            description: `${file.name} exceeds 5MB limit`
          })
          return
        }

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: `${file.name} is not a supported image format`
          })
          return
        }
      }

      setUploading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const uploadedUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${sessionData.session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `listings/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      const newImages = [...uploadedImages, ...uploadedUrls]
      setUploadedImages(newImages)
      form.setValue('images', newImages)

      toast({
        title: "Images uploaded",
        description: "Your images have been uploaded successfully"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images"
      })
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: ListingForm) {
    try {
      setIsLoading(true)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const updateData = {
        type: data.type,
        category: data.category,
        subcategory: data.type === "non_firearms" ? data.subcategory : null,
        calibre: data.type === "firearms" ? data.calibre : null,
        title: data.title,
        description: data.description,
        price: data.price,
        images: data.images,
        thumbnail: data.images[0],
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from("listings")
        .update(updateData)
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Listing updated",
        description: "Your listing has been updated successfully"
      })

      router.push("/profile")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update listing"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const listingType = form.watch("type")

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/profile')}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to profile
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Edit Listing</CardTitle>
            <CardDescription>
              Update your listing details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select listing type" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(listingType === "firearms" ? firearmsCategories : nonFirearmsCategories)
                            .map(([value, label]) => (
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

                {listingType === "non_firearms" && selectedCategory && (
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a subcategory" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(subcategories[selectedCategory as keyof typeof subcategories] || {})
                              .map(([value, label]) => (
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

                {listingType === "firearms" && (
                  <FormField
                    control={form.control}
                    name="calibre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calibre</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 9mm" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter a descriptive title" {...field} />
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
                          placeholder="Provide detailed information about the item"
                          className="min-h-[120px]"
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
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Price (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            onChange(value)
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Images</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                          {uploadedImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-4">
                              {uploadedImages.map((url, index) => (
                                <img
                                  key={url}
                                  src={url}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Upload up to 6 images (max 5MB each). First image will be the thumbnail.
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading || uploading}>
                  {isLoading ? "Updating..." : "Update Listing"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}