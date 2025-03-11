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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft } from "lucide-react"

// List of authorized user IDs
const AUTHORIZED_RETAILER_CREATORS = [
  'e22da8c7-c6af-43b7-8ba0-5bc8946edcda',
  '1a95bbf9-3bca-414d-a99f-1f9c72c15588'
]

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

export default function CreateRetailerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
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

        if (!AUTHORIZED_RETAILER_CREATORS.includes(session.user.id)) {
          toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You are not authorized to create retailer profiles.",
          })
          router.push('/retailers')
          return
        }

        if (mounted) {
          setIsAuthorized(true)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error in session initialization:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeSession()

    return () => {
      mounted = false
    }
  }, [router, supabase, toast])

  const form = useForm<RetailerForm>({
    resolver: zodResolver(retailerSchema),
    defaultValues: {
      businessName: "",
      location: "",
      phone: "",
      email: "",
      description: "",
      website: "",
    }
  })

  // Function to convert business name to slug
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Logo image must be less than 5MB"
        })
        return
      }

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a valid image file (JPEG, PNG, or WebP)"
        })
        return
      }

      setUploadingLogo(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error("Authentication error: " + sessionError.message)
      }
      
      if (!session?.user.id) {
        throw new Error("Not authenticated")
      }

      const fileExt = file.name.split(".").pop()
      const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `retailers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("retailers")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from("retailers")
        .getPublicUrl(filePath)

      setLogoUrl(publicUrl)
      form.setValue("logoUrl", publicUrl)

      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully"
      })
    } catch (error) {
      console.error("Logo upload error:", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo"
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  async function onSubmit(data: RetailerForm) {
    try {
      setIsLoading(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error("Authentication error: " + sessionError.message)
      }
      
      if (!session?.user.id) {
        throw new Error("Not authenticated")
      }

      const slug = slugify(data.businessName)

      // Create the retailer profile
      const { data: retailer, error: retailerError } = await supabase
        .from("retailers")
        .insert({
          ...data,
          owner_id: session.user.id,
          slug,
          logo_url: logoUrl
        })
        .select()
        .single()

      if (retailerError) throw retailerError

      toast({
        title: "Retailer profile created",
        description: "Your retailer profile has been created successfully"
      })

      router.push(`/retailers/${slug}`)
    } catch (error) {
      console.error("Submit error:", error)
      toast({
        variant: "destructive",
        title: "Failed to create retailer profile",
        description: error instanceof Error ? error.message : "Something went wrong"
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

  if (!isAuthorized) {
    return null // Component will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/retailers")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to retailers
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Retailer Profile</CardTitle>
            <CardDescription>
              Add your firearms business to the MaltaGuns directory
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
                  {isLoading ? "Creating profile..." : "Create Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}