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
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Loader2 } from "lucide-react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import slug from 'slug'
import { Database } from "@/lib/database.types"

// List of authorized user IDs
const AUTHORIZED_BLOG_AUTHORS = [
  'e22da8c7-c6af-43b7-8ba0-5bc8946edcda',
  '1a95bbf9-3bca-414d-a99f-1f9c72c15588'
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

const blogPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  featuredImage: z.string().optional(),
})

type BlogPostForm = z.infer<typeof blogPostSchema>

export default function CreateBlogPost() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

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

        if (!AUTHORIZED_BLOG_AUTHORS.includes(session.user.id)) {
          toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You are not authorized to create blog posts.",
          })
          router.push('/blog')
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
        router.push('/login')
      }
    }

    initializeSession()

    return () => {
      mounted = false
    }
  }, [router, supabase, toast])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      form.setValue('content', editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert focus:outline-none min-h-[200px]',
      },
    },
    autofocus: true,
  })

  // Ensure editor is focused when mounted
  useEffect(() => {
    if (editor) {
      editor.commands.focus()
    }
  }, [editor])

  const form = useForm<BlogPostForm>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      content: "",
      featuredImage: "",
    }
  })

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Featured image must be less than 5MB",
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

      setUploadingImage(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Session error:", sessionError)
        throw new Error("Authentication error: " + sessionError.message)
      }
      
      if (!session?.user.id) {
        throw new Error("Not authenticated")
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `blog/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('blog')
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('blog')
        .getPublicUrl(filePath)

      form.setValue('featuredImage', publicUrl)

      toast({
        title: "Image uploaded",
        description: "Your featured image has been uploaded successfully"
      })
    } catch (error) {
      console.error("Image upload error:", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image"
      })
    } finally {
      setUploadingImage(false)
    }
  }

  async function onSubmit(data: BlogPostForm) {
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

      // Double-check authorization
      if (!AUTHORIZED_BLOG_AUTHORS.includes(session.user.id)) {
        throw new Error("Not authorized to create blog posts")
      }

      const postSlug = slug(data.title)

      const { error } = await supabase
        .from("blog_posts")
        .insert({
          author_id: session.user.id,
          title: data.title,
          slug: postSlug,
          content: data.content,
          published: true,
          featured_image: data.featuredImage || null
        })

      if (error) throw error

      toast({
        title: "Post created",
        description: "Your blog post has been published successfully"
      })

      // Keep isLoading true during redirection
      router.push(`/blog/${postSlug}`)
    } catch (error) {
      console.error("Submit error:", error)
      toast({
        variant: "destructive",
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Something went wrong"
      })
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
      </div>
    )
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/blog")}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to blog
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Blog Post</CardTitle>
            <CardDescription>
              Share your knowledge and experience with the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter post title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured Image</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
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
                            <img
                              src={field.value}
                              alt="Featured image preview"
                              className="w-full max-h-[300px] object-cover rounded-lg"
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
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <div className="min-h-[400px] border rounded-lg">
                          <MenuBar />
                          <div className="p-4">
                            <EditorContent editor={editor} />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  disabled={isLoading || uploadingImage}
                >
                  {(isLoading || uploadingImage) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadingImage ? "Uploading Image..." : "Publishing..."}
                    </>
                  ) : (
                    "Publish Post"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}