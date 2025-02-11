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

export default function EditRetailerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)

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
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session?.user) {
          router.push("/login")
          return
        }

        const { data: retailer, error } = await supabase
          .from("retailers")
          .select("*")
          .eq("id", params.id)
          .single()

        if (error) throw error

        if (retailer.owner_id !== sessionData.session.user.id) {
          toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You can only edit your own retailer profile.",
          })
          router.push("/profile")
          return
        }

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
          variant: "destructive",
          title: "Error",
          description: "Failed to load retailer details.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadRetailer()
  }, [params.id, router, form, toast])

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Logo image must be under 5MB",
        })
        return
      }

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload an image file (JPEG/PNG/WebP)",
        })
        return
      }

      setUploadingLogo(true)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${sessionData.session.user.id}-${Date.now()}.${fileExt}`
      const filePath = `retailers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('retailers')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('retailers')
        .getPublicUrl(filePath)

      form.setValue('logoUrl', publicUrl)

      toast({
        title: "Logo uploaded",
        description: "Your business logo has been uploaded successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  async function onSubmit(data: RetailerForm) {
    try {
      setIsLoading(true)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const { error } = await supabase
        .from("retailers")
        .update({
          business_name: data.businessName,
          logo_url: data.logoUrl,
          location: data.location,
          phone: data.phone,
          email: data.email,
          description: data.description,
          website: data.website || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Profile updated",
        description: "Your retailer profile has been updated successfully"
      })

      router.push("/profile")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile"
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
      <div className="max-w-2xl mx-auto">
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
              Update your business information on MaltaGuns
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
                          <Input type="email" placeholder="contact@example.com" {...field} />
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