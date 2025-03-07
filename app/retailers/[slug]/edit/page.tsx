"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { ArrowLeft } from "lucide-react"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

const retailerSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  location: z.string().min(5, "Location is required"),
  phone: z.string().min(8, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  logoUrl: z.string().optional()
})

type RetailerForm = z.infer<typeof retailerSchema>

export default function EditRetailerPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [retailerId, setRetailerId] = useState<string | null>(null)

  const form = useForm<RetailerForm>({
    resolver: zodResolver(retailerSchema),
    defaultValues: {
      businessName: "",
      location: "",
      phone: "",
      email: "",
      description: "",
      website: "",
      logoUrl: ""
    }
  })

  useEffect(() => {
    async function loadRetailer() {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          toast({
            title: "Authentication required",
            description: "You must be logged in to edit a retailer.",
            variant: "destructive",
          })
          router.push(`/retailers/${params.slug}`)
          return
        }

        // Fetch retailer by slug
        const { data: retailer, error: retailerError } = await supabase
          .from("retailers")
          .select("*")
          .eq("slug", params.slug)
          .single()

        if (retailerError || !retailer) {
          toast({
            title: "Retailer not found",
            description: "The retailer you're trying to edit doesn't exist.",
            variant: "destructive",
          })
          router.push("/retailers")
          return
        }

        // Check if user is the owner
        if (retailer.owner_id !== session.user.id) {
          toast({
            title: "Unauthorized",
            description: "You don't have permission to edit this retailer.",
            variant: "destructive",
          })
          router.push(`/retailers/${params.slug}`)
          return
        }

        setRetailerId(retailer.id)

        // Set form values
        form.reset({
          businessName: retailer.business_name,
          location: retailer.location,
          phone: retailer.phone || "",
          email: retailer.email || "",
          description: retailer.description || "",
          website: retailer.website || "",
          logoUrl: retailer.logo_url || ""
        })
      } catch (error) {
        console.error("Error loading retailer:", error)
        toast({
          title: "Error",
          description: "Failed to load retailer information.",
          variant: "destructive",
        })
        router.push("/retailers")
      } finally {
        setIsLoading(false)
      }
    }

    loadRetailer()
  }, [params.slug, router, toast, form])

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }

    if (!retailerId) {
      toast({
        title: "Error",
        description: "Retailer information is missing.",
        variant: "destructive",
      })
      return
    }

    const file = event.target.files[0]
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Logo image must be less than 5MB.",
        variant: "destructive",
      })
      return
    }
    
    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG, and WebP images are allowed.",
        variant: "destructive",
      })
      return
    }
    
    setUploadingLogo(true)
    
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${retailerId}-${Date.now()}.${fileExt}`
      const filePath = `retailers/${fileName}`
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('retailers')
        .upload(filePath, file)
        
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('retailers')
        .getPublicUrl(filePath)
        
      // Update form
      form.setValue('logoUrl', publicUrl)
      
      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully.",
      })
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  async function onSubmit(data: RetailerForm) {
    if (!retailerId) {
      toast({
        title: "Error",
        description: "Retailer information is missing.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Generate slug from business name
      const slug = data.businessName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')

      // Update retailer
      const { error: updateError } = await supabase
        .from("retailers")
        .update({
          business_name: data.businessName,
          location: data.location,
          phone: data.phone,
          email: data.email,
          description: data.description,
          website: data.website,
          logo_url: data.logoUrl,
          slug: slug
        })
        .eq("id", retailerId)

      if (updateError) throw updateError

      toast({
        title: "Retailer updated",
        description: "Your retailer information has been updated successfully.",
      })

      // Redirect to retailer page
      router.push(`/retailers/${slug}`)
    } catch (error) {
      console.error("Error updating retailer:", error)
      toast({
        title: "Error",
        description: "Failed to update retailer information.",
        variant: "destructive",
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

  return (
      <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/profile")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to profile
          </Button>
        </div>


      <Card>
        <CardHeader>
          <CardTitle>Edit Retailer Profile</CardTitle>
          <CardDescription>
            Update your business information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Logo</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                        <Input type="hidden" {...field} />
                        {uploadingLogo && (
                          <p className="text-sm text-muted-foreground">
                            Uploading logo...
                          </p>
                        )}
                        {field.value && (
                          <img
                            src={field.value}
                            alt="Business logo preview"
                            className="w-32 h-32 object-contain rounded-lg"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your business address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+356 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="info@maltaguns.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your business and services"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (Optional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading || uploadingLogo}>
                {isLoading ? "Updating profile..." : "Update Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}