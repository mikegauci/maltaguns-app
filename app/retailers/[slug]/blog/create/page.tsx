"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Image as ImageIcon } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from "@/hooks/use-toast"
import { Database } from "@/lib/database.types"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'

// Constants for file upload
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

// Helper function for content image uploads
async function uploadContentImage(file: File, supabase: any, retailerId: string, userId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-content-${Date.now()}-${Math.random()}.${fileExt}`
  const filePath = `retailer-blog/${retailerId}/content/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('retailers')
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: { publicUrl } } = supabase.storage
    .from('retailers')
    .getPublicUrl(filePath)

  return publicUrl
}

export default function CreateRetailerBlogPost({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [retailerId, setRetailerId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [featuredImage, setFeaturedImage] = useState<File | null>(null)
  const [featuredImageUrl, setFeaturedImageUrl] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingContentImage, setUploadingContentImage] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert focus:outline-none min-h-[300px] p-4',
      },
    },
    autofocus: true,
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFeaturedImage(file)
      setFeaturedImageUrl(URL.createObjectURL(file))
    }
  }

  const addImage = async () => {
    try {
      // Create file input element
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      
      // Handle file selection
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) return
        
        // Validate file
        if (file.size > MAX_FILE_SIZE) {
          toast({
            variant: "destructive",
            title: "File too large",
            description: "Image must be less than 5MB",
          })
          return
        }

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: "Please upload a valid image file (JPEG, PNG, or WebP)",
          })
          return
        }

        setUploadingContentImage(true)
        
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
          if (sessionError || !session?.user.id || !retailerId) {
            throw new Error("Authentication error or retailer ID not found")
          }
          
          // Upload the image
          const imageUrl = await uploadContentImage(file, supabase, retailerId, session.user.id)
          
          // Insert the image into the editor
          if (editor) {
            editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run()
          }
          
          toast({
            title: "Image inserted",
            description: "Your image has been added to the post"
          })
        } catch (error) {
          console.error("Content image upload error:", error)
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: error instanceof Error ? error.message : "Failed to upload image"
          })
        } finally {
          setUploadingContentImage(false)
        }
      }
      
      // Trigger file selection
      input.click()
    } catch (error) {
      console.error("Error adding image:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add image to post"
      })
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

    if (!title || !editor || !editor.getHTML()) {
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
      const slug = slugify(title)
      
      // Upload featured image if provided
      let featured_image = null
      if (featuredImage) {
        const fileExt = featuredImage.name.split('.').pop()
        const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `retailer-blog/${retailerId}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('retailers')
          .upload(filePath, featuredImage, {
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
          title: title,
          content: editor.getHTML(),
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
      
      // Keep isLoading true during redirection
      router.push(`/retailers/${params.slug}`)
    } catch (error) {
      console.error("Error creating blog post:", error)
      toast({
        title: "Error",
        description: "There was a problem creating your blog post. Please try again.",
        variant: "destructive",
      })
      // Only reset isLoading on error
      setIsLoading(false)
    }
  }

  const MenuBar = () => {
    if (!editor) return null

    return (
      <div className="border rounded-lg p-2 mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-accent' : ''}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addImage}
          disabled={uploadingContentImage}
        >
          {uploadingContentImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    )
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
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Enter blog post title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <div className="min-h-[400px] border rounded-lg">
                  <MenuBar />
                  <EditorContent editor={editor} className="p-4" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="featuredImage">Featured Image</Label>
                <Input
                  id="featuredImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {featuredImageUrl && (
                  <div className="mt-2 aspect-video relative overflow-hidden rounded-md">
                    <img
                      src={featuredImageUrl}
                      alt="Featured image preview"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 text-white" 
                disabled={isLoading || uploadingImage || uploadingContentImage}
              >
                {(isLoading || uploadingImage || uploadingContentImage) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingImage ? "Uploading Image..." : 
                     uploadingContentImage ? "Adding Image..." : "Publishing..."}
                  </>
                ) : (
                  "Publish Post"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 