"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

const licenseSchema = z.object({
  licenseNumber: z.string().min(3, "License number is required"),
  licenseType: z.string().min(1, "License type is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  imageUrl: z.string().min(1, "License image is required"),
})

type LicenseForm = z.infer<typeof licenseSchema>

export default function LicenseVerification() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const form = useForm<LicenseForm>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: "",
      licenseType: "",
      expiryDate: "",
      imageUrl: "",
    },
  })

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingImage(true)
      const file = event.target.files?.[0]
      if (!file) return

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${sessionData.session.user.id}-${Math.random()}.${fileExt}`
      const filePath = `licenses/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('licenses')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('licenses')
        .getPublicUrl(filePath)

      form.setValue('imageUrl', publicUrl)
      toast({
        title: "Image uploaded",
        description: "Your license image has been uploaded successfully.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  async function onSubmit(data: LicenseForm) {
    try {
      setIsLoading(true)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const { error } = await supabase
        .from("licenses")
        .insert({
          profile_id: sessionData.session.user.id,
          license_number: data.licenseNumber,
          license_type: data.licenseType,
          expiry_date: data.expiryDate,
          image_url: data.imageUrl,
          status: "pending"
        })

      if (error) throw error

      toast({
        title: "License submitted",
        description: "Your license has been submitted for verification.",
      })

      router.push("/profile")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit license",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>License Verification</CardTitle>
            <CardDescription>
              Submit your firearms license for verification to start selling on MaltaGuns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your license number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Firearms Dealer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Image</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                          <Input type="hidden" {...field} />
                          {uploadingImage && (
                            <p className="text-sm text-muted-foreground">
                              Uploading image...
                            </p>
                          )}
                          {field.value && (
                            <p className="text-sm text-muted-foreground">
                              Image uploaded successfully
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading || uploadingImage}>
                  {isLoading ? "Submitting..." : "Submit License for Verification"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}