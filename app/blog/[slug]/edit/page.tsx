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
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote } from "lucide-react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import slug from 'slug'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

const blogPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  featuredImage: z.string().optional(),
  published: z.boolean(),
})

type BlogPostForm = z.infer<typeof blogPostSchema>

export default function EditBlogPost({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [postId, setPostId] = useState<string | null>(null)

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
  })

  const form = useForm<BlogPostForm>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "",
      content: "",
      featuredImage: "",
      published: true,
    }
  })

  useEffect(() => {
    async function loadPost() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session?.user) {
          router.push("/login")
          return
        }

        const { data: post, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("slug", params.slug)
          .single()

        if (error) throw error

        if (post.author_id !== sessionData.session.user.id) {
          toast({
            variant: "destructive",
            title: "Unauthorized",
            description: "You can only edit your own blog posts.",
          })
          router.push("/profile")
          return
        }

        setPostId(post.id)
        form.reset({
          title: post.title,
          content: post.content,
          featuredImage: post.featured_image || "",
          published: post.published,
        })

        if (editor) {
          editor.commands.setContent(post.content)
        }
      } catch (error) {
        console.error("Error loading post:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load blog post.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (editor) {
      loadPost()
    }
  }, [params.slug, router, form, editor, toast])

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Featured image must be under 5MB",
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

      setUploadingImage(true)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${sessionData.session.user.id}-${Date.now()}.${fileExt}`
      const filePath = `blog/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('blog')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('blog')
        .getPublicUrl(filePath)

      form.setValue('featuredImage', publicUrl)

      toast({
        title: "Image uploaded",
        description: "Your featured image has been uploaded successfully",
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

  async function onSubmit(data: BlogPostForm) {
    if (!postId) return

    try {
      setIsLoading(true)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user.id) {
        throw new Error("Not authenticated")
      }

      const postSlug = slug(data.title)

      const { error } = await supabase
        .from("blog_posts")
        .update({
          title: data.title,
          slug: postSlug,
          content: data.content,
          published: data.published,
          featured_image: data.featuredImage || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", postId)

      if (error) throw error

      toast({
        title: "Post updated",
        description: "Your blog post has been updated successfully"
      })

      router.push(`/blog/${postSlug}`)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Something went wrong"
      })
    } finally {
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
        <p className="text-muted-foreground">Loading post...</p>
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
            <CardTitle>Edit Blog Post</CardTitle>
            <CardDescription>
              Update your blog post content and settings
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

                <Button type="submit" className="w-full" disabled={isLoading || uploadingImage}>
                  {isLoading ? "Updating..." : "Update Post"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}