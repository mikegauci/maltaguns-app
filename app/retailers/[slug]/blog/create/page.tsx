"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from "@/hooks/use-toast"
import { Database } from "@/lib/database.types"

export default function CreateRetailerBlogPost({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [retailerId, setRetailerId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    featuredImage: null as File | null,
    featuredImageUrl: "",
  })

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
      try {
        // Get session
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

        // Store user ID for later use
        setUserId(session.user.id)

        // First get the retailer ID from the slug
        const { data: retailer, error: retailerError } = await supabase
          .from("retailers")
          .select("*")
          .eq("slug", params.slug)
          .single()

        if (retailerError || !retailer) {
          console.error('Error fetching retailer:', retailerError)
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

        if (mounted) {
          setIsAuthorized(true)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error in session initialization:', error)
        toast({
          title: "Error",
          description: "Failed to initialize session. Please try again.",
          variant: "destructive",
        })
        if (mounted) {
          setIsLoading(false)
        }
        router.push('/login')
      }
    }

    initializeSession()

    return () => {
      mounted = false
    }
  }, [params.slug, router, supabase, toast])

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
    
    if (!retailerId || !userId) {
      toast({
        title: "Error",
        description: "User or retailer information is missing.",
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
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error("Authentication error: " + sessionError.message)
      }
      
      if (!session?.user.id) {
        throw new Error("Not authenticated")
      }

      // Generate slug from title
      const slug = slugify(formData.title)
      
      // Upload featured image if provided
      let featured_image = null
      if (formData.featuredImage) {
        const fileExt = formData.featuredImage.name.split('.').pop()
        const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `retailer-blog/${retailerId}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('retailers')
          .upload(filePath, formData.featuredImage, {
            cacheControl: "3600",
            upsert: false
          })
          
        if (uploadError) {
          throw uploadError
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('retailers')
          .getPublicUrl(filePath)
          
        featured_image = publicUrl
      }
      
      // Create blog post with author_id
      const { data: post, error: postError } = await supabase
        .from('retailer_blog_posts')
        .insert({
          title: formData.title,
          content: formData.content,
          featured_image,
          slug,
          published: true,
          retailer_id: retailerId,
          author_id: session.user.id,
        })
        .select()
        
      if (postError) {
        throw postError
      }
      
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // Component will redirect in useEffect
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