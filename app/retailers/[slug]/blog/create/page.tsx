"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function CreateRetailerBlogPost({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [retailerId, setRetailerId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    featuredImage: null as File | null,
    featuredImageUrl: "",
  })

  useEffect(() => {
    async function checkAuthorization() {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to create a blog post.",
          variant: "destructive",
        })
        router.push(`/retailers/${params.slug}`)
        return
      }

      // First get the retailer ID from the slug
      const { data: retailer, error: retailerError } = await supabase
        .from("retailers")
        .select("*")
        .eq("slug", params.slug)
        .single()

      if (retailerError || !retailer) {
        toast({
          title: "Retailer not found",
          description: "The retailer you're trying to create a blog post for doesn't exist.",
          variant: "destructive",
        })
        router.push("/retailers")
        return
      }

      setRetailerId(retailer.id)

      // Check if user is the owner of this retailer
      if (retailer.owner_id !== session.user.id) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to create blog posts for this retailer.",
          variant: "destructive",
        })
        router.push(`/retailers/${params.slug}`)
        return
      }

      setIsAuthorized(true)
    }

    checkAuthorization()
  }, [params.slug, router, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFormData((prev) => ({ 
        ...prev, 
        featuredImage: file,
        featuredImageUrl: URL.createObjectURL(file)
      }))
    }
  }

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!retailerId) {
      toast({
        title: "Error",
        description: "Retailer information is missing.",
        variant: "destructive",
      })
      return
    }

    if (!formData.title || !formData.content) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Generate slug from title
      const slug = slugify(formData.title)
      
      // Upload featured image if provided
      let featured_image = null
      if (formData.featuredImage) {
        const fileExt = formData.featuredImage.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `retailer-blog/${retailerId}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(filePath, formData.featuredImage)
          
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('blog-images')
          .getPublicUrl(filePath)
          
        featured_image = publicUrl
      }
      
      // Create blog post
      const { data: post, error: postError } = await supabase
        .from('retailer_blog_posts')
        .insert({
          title: formData.title,
          content: formData.content,
          featured_image,
          slug,
          published: true,
          retailer_id: retailerId,
        })
        .select()
        
      if (postError) throw postError
      
      toast({
        title: "Blog post created",
        description: "Your blog post has been published successfully.",
      })
      
      // Redirect to the retailer page
      router.push(`/retailers/${params.slug}`)
    } catch (error) {
      console.error("Error creating blog post:", error)
      toast({
        title: "Error",
        description: "There was a problem creating your blog post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p>Checking authorization...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/retailers/${params.slug}`)}
          className="flex items-center text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to retailer
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create Blog Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter blog post title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Write your blog post content here..."
                  className="min-h-[300px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="featuredImage">Featured Image</Label>
                <Input
                  id="featuredImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {formData.featuredImageUrl && (
                  <div className="mt-2 aspect-video relative overflow-hidden rounded-md">
                    <img
                      src={formData.featuredImageUrl}
                      alt="Featured image preview"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Publishing..." : "Publish Blog Post"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 