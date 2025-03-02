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

export default function CreateRetailerBlogPost({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
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
        router.push(`/retailers/${params.id}`)
        return
      }

      // Check if user is the owner of this retailer
      const { data: retailer } = await supabase
        .from("retailers")
        .select("owner_id")
        .eq("id", params.id)
        .single()

      if (!retailer || retailer.owner_id !== session.user.id) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to create blog posts for this retailer.",
          variant: "destructive",
        })
        router.push(`/retailers/${params.id}`)
        return
      }

      setIsAuthorized(true)
    }

    checkAuthorization()
  }, [params.id, router, toast])

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
    
    if (!isAuthorized) {
      toast({
        title: "Unauthorized",
        description: "You don't have permission to create blog posts for this retailer.",
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
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("User not authenticated")

      // Generate slug
      const slug = slugify(formData.title)

      // Upload image if provided
      let featuredImagePath = null
      if (formData.featuredImage) {
        const fileExt = formData.featuredImage.name.split('.').pop()
        const fileName = `retailer-${params.id}-${Date.now()}.${fileExt}`
        const filePath = `blog/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('blog')
          .upload(filePath, formData.featuredImage)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('blog')
          .getPublicUrl(filePath)

        featuredImagePath = publicUrl
      }

      // Create blog post in the retailer_blog_posts table
      const blogPostData = {
        title: formData.title,
        slug,
        content: formData.content,
        featured_image: featuredImagePath,
        published: true,
        author_id: session.user.id,
        retailer_id: params.id
      };
      
      // First, get the user's profile to ensure it exists
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) {
        // If profile doesn't exist, create a default one
        if (profileError.code === 'PGRST116') {
          const { error: insertProfileError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              username: session.user.email?.split('@')[0] || 'user',
              email: session.user.email
            });
            
          if (insertProfileError) {
            console.error("Error creating user profile:", insertProfileError);
          }
        }
      }
      
      // Insert the blog post
      const { data: insertedPost, error: insertError } = await supabase
        .from('retailer_blog_posts')
        .insert(blogPostData)
        .select();
        
      if (insertError) {
        console.error("Error creating blog post:", insertError);
        throw insertError;
      }

      toast({
        title: "Blog post created",
        description: "Your blog post has been published successfully.",
      })

      // Force a refresh by using replace instead of push
      router.refresh();
      router.replace(`/retailers/${params.id}`);
    } catch (error) {
      console.error("Error creating blog post:", error)
      toast({
        title: "Error",
        description: "Failed to create blog post. Please try again.",
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
          onClick={() => router.push(`/retailers/${params.id}`)}
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