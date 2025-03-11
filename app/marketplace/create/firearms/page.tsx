"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, X, Loader2 } from "lucide-react"
import { CreditDialog } from "@/components/credit-dialog"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 6
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const DEFAULT_LISTING_IMAGE = "/images/maltaguns-default-img.jpg"

const firearmsCategories = {
  "airguns": "Airguns",
  "ammunition": "Ammunition",
  "black_powder": "Black powder",
  "carbines": "Carbines",
  "crossbow": "Crossbow",
  "pistols": "Pistols",
  "replica_deactivated": "Replica or Deactivated",
  "revolvers": "Revolvers",
  "rifles": "Rifles",
  "schedule_1": "Schedule 1 (automatic)",
  "shotguns": "Shotguns"
} as const

const firearmsSchema = z.object({
  category: z.enum(["airguns", "ammunition", "black_powder", "carbines", "crossbow", "pistols", "replica_deactivated", "revolvers", "rifles", "schedule_1", "shotguns"]),
  calibre: z.string().min(1, "Calibre is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must not exceed 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must not exceed 2000 characters"),
  price: z.coerce.number().min(1, "Price must be at least €1"),
  images: z.array(z.any()).max(MAX_FILES, `Maximum ${MAX_FILES} images allowed`).optional().default([])
})

type FirearmsForm = z.infer<typeof firearmsSchema>

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
}

export default function CreateFirearmsListing() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isRetailer, setIsRetailer] = useState(false)
  const [hasCredits, setHasCredits] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FirearmsForm>({
    resolver: zodResolver(firearmsSchema),
    defaultValues: {
      category: "airguns",
      calibre: "",
      title: "",
      description: "",
      price: 0,
      images: []
    }
  })

  useEffect(() => {
    let mounted = true

    async function checkCredits() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push('/login')
          return
        }

        if (!session) {
          console.log('No session found')
          router.push('/login')
          return
        }

        // Validate session expiry
        const sessionExpiry = new Date(session.expires_at! * 1000)
        const now = new Date()
        const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
        const isNearExpiry = timeUntilExpiry < 5 * 60 * 1000 // 5 minutes

        if (isNearExpiry) {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshError || !refreshedSession) {
            console.error('Session refresh failed:', refreshError)
            router.push('/login')
            return
          }
        }

        if (mounted) {
          setUserId(session.user.id)

          // Check if user is a retailer
          const { data: retailerData, error: retailerError } = await supabase
            .from("retailers")
            .select("id")
            .eq("owner_id", session.user.id)
            .single()

          if (retailerError && retailerError.code !== 'PGRST116') {
            console.error('Error checking retailer status:', retailerError)
          }

          setIsRetailer(!!retailerData)

          // Get user credits
          const { data: creditsData, error: creditsError } = await supabase
            .from("credits")
            .select("amount")
            .eq("user_id", session.user.id)
            .single()

          if (creditsError && creditsError.code !== 'PGRST116') {
            console.error('Error fetching credits:', creditsError)
          }

          const currentCredits = creditsData?.amount || 0
          setCredits(currentCredits)
          setHasCredits(currentCredits > 0 || !!retailerData)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error in checkCredits:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkCredits()

    return () => {
      mounted = false
    }
  }, [router, supabase])

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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error("Authentication error: " + sessionError.message)
      }
      
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const uploadedUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split(".").pop()
        const fileName = `${sessionData.session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `listings/${fileName}`

        console.log("Attempting to upload file:", filePath)
        
        const { error: uploadError } = await supabase.storage
          .from("listings")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
          })

        if (uploadError) {
          console.error("Upload error:", uploadError)
          throw new Error("Upload failed: " + uploadError.message)
        }

        const { data: { publicUrl } } = supabase.storage
          .from("listings")
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      setUploadedImages([...uploadedImages, ...uploadedUrls])
      form.setValue("images", [...uploadedImages, ...uploadedUrls])

      toast({
        title: "Images uploaded",
        description: "Your images have been uploaded successfully"
      })
    } catch (error) {
      console.error("Image upload error:", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = (indexToDelete: number) => {
    const newImages = [...uploadedImages];
    newImages.splice(indexToDelete, 1);
    setUploadedImages(newImages);
    form.setValue("images", newImages);
    
    toast({
      title: "Image removed",
      description: "The image has been removed from your listing"
    });
  };

  async function onSubmit(data: FirearmsForm) {
    try {
      setIsSubmitting(true);
      if (credits < 1) {
        setShowCreditDialog(true)
        return
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error("Authentication error: " + sessionError.message)
      }
      
      if (!session?.user.id) {
        throw new Error("Not authenticated")
      }

      // Get all image URLs
      const imageUrls = data.images.map(img => typeof img === 'string' ? img : img.toString());
      
      console.log("Attempting to create firearms listing with simplified data");
      
      // Create a simplified listing object
      const listingData = {
        seller_id: session.user.id,
        type: "firearms",
        category: data.category,
        calibre: data.calibre,
        title: data.title,
        description: data.description,
        price: data.price,
        // Format the images as a PostgreSQL array literal, use default image if no images provided
        images: imageUrls.length > 0 ? `{${imageUrls.map(url => `"${url}"`).join(',')}}` : `{"${DEFAULT_LISTING_IMAGE}"}`,
        thumbnail: imageUrls[0] || DEFAULT_LISTING_IMAGE
      };
      
      console.log("Creating listing with data:", listingData);
      
      // Create the listing
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert(listingData)
        .select('id, title')
        .single();
        
      if (listingError) {
        console.error("Error creating listing:", listingError);
        throw listingError;
      }

      // Deduct one credit
      const { error: creditError } = await supabase
        .from("credits")
        .update({ 
          amount: credits - 1,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", session.user.id)

      if (creditError) {
        console.error("Error updating credits:", creditError);
        throw creditError;
      }
      
      toast({
        title: "Listing created",
        description: "Your listing has been created successfully"
      });
      
      router.push(`/marketplace/listing/${slugify(listing.title)}`);
    } catch (error) {
      console.error("Error creating listing:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
      // Only reset isSubmitting on error
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/marketplace/create")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to listing types
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Credits remaining:</span>
            <span className="font-semibold">{credits}</span>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create Firearms Listing</CardTitle>
            <CardDescription>
              List your firearm for sale on the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(firearmsCategories)
                            .filter(([value]) => value !== "ammunition" || isRetailer)
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

                <FormField
                  control={form.control}
                  name="calibre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calibre</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 9mm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          placeholder="Provide detailed information about the firearm"
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
                  render={({ field: { onChange, value, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Price (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="Enter price"
                          onChange={(e) => {
                            // Allow empty input for typing
                            const inputValue = e.target.value;
                            
                            // If empty, set to empty string in the UI but pass 0 to the form
                            if (inputValue === "") {
                              onChange(0);
                              return;
                            }
                            
                            // Remove leading zeros
                            const cleanedValue = inputValue.replace(/^0+(?=\d)/, '');
                            e.target.value = cleanedValue;
                            
                            // Parse as float if valid number
                            const parsed = parseFloat(cleanedValue);
                            if (!isNaN(parsed)) {
                              onChange(parsed);
                            }
                          }}
                          value={value === 0 ? "" : value}
                          {...fieldProps}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        Price must be at least €1
                      </FormDescription>
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
                          <div className="flex flex-col items-start">
                            <label 
                              htmlFor="image-upload" 
                              className={`cursor-pointer px-4 py-2 rounded-md text-sm font-medium transition-colors
                                ${uploadedImages.length >= MAX_FILES 
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70" 
                                  : uploadedImages.length > 0 
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                            >
                              {uploadedImages.length >= MAX_FILES 
                                ? "Maximum Images Reached" 
                                : uploadedImages.length > 0 
                                  ? "Add More Images" 
                                  : "Choose Files"}
                            </label>
                            <Input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              disabled={uploading || uploadedImages.length >= MAX_FILES}
                              className="hidden"
                              ref={fileInputRef}
                            />
                          </div>
                          {uploadedImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-4">
                              {uploadedImages.map((url, index) => (
                                <div key={url} className="relative group">
                                  <img
                                    src={url}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteImage(index)}
                                    className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 
                                              text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Delete image"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Upload up to 6 images (max 5MB each). First image will be used as thumbnail. If no image is uploaded, a default image will be used.
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  disabled={isSubmitting || uploading || !hasCredits}
                >
                  {(isSubmitting || uploading) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploading ? "Uploading Images..." : "Creating..."}
                    </>
                  ) : !hasCredits ? (
                    "Insufficient Credits"
                  ) : (
                    "Create Listing"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>


        {userId && (
          <CreditDialog 
            open={showCreditDialog} 
            onOpenChange={setShowCreditDialog}
            userId={userId}
            onSuccess={() => {
              setShowCreditDialog(false);
              router.refresh();
            }}
          />
        )}
      </div>
      </div>
    )
  }