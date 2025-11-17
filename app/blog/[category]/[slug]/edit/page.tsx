'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BackButton } from '@/components/ui/back-button'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Loader2,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import slug from 'slug'
import { Database } from '@/lib/database.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  content: z.string().min(1, { message: 'Content is required' }),
  featuredImage: z.string().optional(),
  published: z.boolean().default(false),
  category: z.enum(['news', 'guides'], {
    required_error: 'Please select a category',
  }),
})

type FormData = z.infer<typeof formSchema>

async function uploadContentImage(file: File, supabase: any, userId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-content-${Date.now()}-${Math.random()}.${fileExt}`
  const filePath = `blog/content/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('blog')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('blog').getPublicUrl(filePath)

  return publicUrl
}

export default function EditBlogPost({
  params,
}: {
  params: { category: string; slug: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [postId, setPostId] = useState<string | null>(null)
  const [uploadingContentImage, setUploadingContentImage] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [openInNewTab, setOpenInNewTab] = useState(true)
  const [imageAltDialogOpen, setImageAltDialogOpen] = useState(false)
  const [imageAltText, setImageAltText] = useState('')
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [selectedImage, setSelectedImage] = useState<{
    src: string
    alt: string
  } | null>(null)
  const [isEditingExistingImage, setIsEditingExistingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'cursor-pointer hover:ring-2 hover:ring-primary/50 rounded-md',
        },
      }),
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
        class:
          'prose prose-neutral dark:prose-invert focus:outline-none min-h-[200px]',
      },
      handleClick: (view, pos, event) => {
        // Check if the clicked element is an image
        const domEvent = event as MouseEvent
        const element = domEvent.target as HTMLElement

        if (element.tagName === 'IMG') {
          const img = element as HTMLImageElement
          setSelectedImage({
            src: img.src,
            alt: img.alt || '',
          })
          setImageAltText(img.alt || '')
          setIsEditingExistingImage(true)
          setImageAltDialogOpen(true)
          return true
        }
        return false
      },
    },
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      featuredImage: '',
      published: false,
      category: 'news',
    },
  })

  useEffect(() => {
    let mounted = true

    async function loadPost() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

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
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession()

          if (refreshError || !refreshedSession) {
            console.error('Session refresh failed:', refreshError)
            router.push('/login')
            return
          }
        }

        const { data: post, error: postError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', params.slug)
          .single()

        if (postError) {
          console.error('Error fetching post:', postError)
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load blog post.',
          })
          return
        }

        if (!post) {
          console.log('Post not found:', params.slug)
          toast({
            variant: 'destructive',
            title: 'Not found',
            description: "The blog post you're trying to edit doesn't exist.",
          })
          router.push('/blog')
          return
        }

        if (post.author_id !== session.user.id) {
          toast({
            variant: 'destructive',
            title: 'Unauthorized',
            description: 'You can only edit your own blog posts.',
          })
          router.push('/blog')
          return
        }

        if (mounted) {
          setPostId(post.id)
          form.reset({
            title: post.title,
            content: post.content,
            featuredImage: post.featured_image || '',
            published: post.published,
            category: post.category || 'news',
          })

          if (editor) {
            editor.commands.setContent(post.content)
          }
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error loading post:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load blog post.',
        })
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    if (editor) {
      loadPost()
    }

    return () => {
      mounted = false
    }
  }, [params.slug, router, form, editor, supabase, toast])

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Featured image must be less than 5MB',
        })
        return
      }

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload a valid image file (JPEG, PNG, or WebP)',
        })
        return
      }

      setUploadingImage(true)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }

      if (!session?.user.id) {
        throw new Error('Not authenticated')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `blog/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('blog')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('blog').getPublicUrl(filePath)

      form.setValue('featuredImage', publicUrl)

      toast({
        title: 'Image uploaded',
        description: 'Your featured image has been uploaded successfully',
      })
    } catch (error) {
      console.error('Image upload error:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload image',
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const addImage = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'

      input.onchange = async event => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) return

        if (file.size > MAX_FILE_SIZE) {
          toast({
            variant: 'destructive',
            title: 'File too large',
            description: 'Image must be less than 5MB',
          })
          return
        }

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast({
            variant: 'destructive',
            title: 'Invalid file type',
            description:
              'Please upload a valid image file (JPEG, PNG, or WebP)',
          })
          return
        }

        setPendingImageFile(file)
        // Remove file extension from filename for alt text
        const altTextWithoutExtension = file.name.replace(/\.[^/.]+$/, '')
        setImageAltText(altTextWithoutExtension)
        setImageAltDialogOpen(true)
      }

      input.click()
    } catch (error) {
      console.error('Error adding image:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add image to post',
      })
    }
  }

  const handleImageInsert = async () => {
    if (!imageAltText) return

    if (isEditingExistingImage && selectedImage) {
      // Update existing image alt text
      editor
        ?.chain()
        .focus()
        .setImage({
          src: selectedImage.src,
          alt: imageAltText,
        })
        .run()

      toast({
        title: 'Alt text updated',
        description: 'Image alt text has been updated successfully',
      })

      // Reset state
      setImageAltDialogOpen(false)
      setImageAltText('')
      setSelectedImage(null)
      setIsEditingExistingImage(false)
      return
    }

    if (!pendingImageFile) return

    setUploadingContentImage(true)
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user.id) {
        throw new Error('Authentication error')
      }

      const imageUrl = await uploadContentImage(
        pendingImageFile,
        supabase,
        session.user.id
      )

      if (editor) {
        editor
          .chain()
          .focus()
          .setImage({ src: imageUrl, alt: imageAltText })
          .run()
      }

      toast({
        title: 'Image inserted',
        description: 'Your image has been added to the post',
      })

      // Reset state
      setImageAltDialogOpen(false)
      setImageAltText('')
      setPendingImageFile(null)
      setIsEditingExistingImage(false)
    } catch (error) {
      console.error('Content image upload error:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload image',
      })
    } finally {
      setUploadingContentImage(false)
    }
  }

  const setLink = () => {
    if (!editor) return

    // Check if text is selected
    if (!editor.state.selection.empty) {
      setLinkDialogOpen(true)
    } else {
      toast({
        variant: 'destructive',
        title: 'No text selected',
        description: 'Please select some text to add a link.',
      })
    }
  }

  const applyLink = () => {
    if (!editor || !linkUrl) return

    // Set link with appropriate target attribute
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: linkUrl,
        target: openInNewTab ? '_blank' : null,
      })
      .run()

    // Reset state
    setLinkUrl('')
    setLinkDialogOpen(false)
  }

  const removeLink = () => {
    if (!editor) return

    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  async function onSubmit(data: FormData) {
    if (!postId) return

    setIsSubmitting(true)
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Not authenticated')
      }

      // First get the current post to preserve establishment IDs
      const { data: currentPost, error: getError } = await supabase
        .from('blog_posts')
        .select('store_id, servicing_id, club_id, range_id')
        .eq('id', postId)
        .single()

      if (getError) {
        console.error('Error fetching current post data:', getError)
        throw getError
      }

      // Log which establishment IDs are being preserved
      console.log('Preserving establishment IDs:', {
        store_id: currentPost.store_id,
        servicing_id: currentPost.servicing_id,
        club_id: currentPost.club_id,
        range_id: currentPost.range_id,
      })

      // Upload featured image if selected
      let featured_image = data.featuredImage
      if (pendingImageFile) {
        const { data: uploadData, error: uploadError } =
          await uploadContentImage(pendingImageFile, supabase, session.user.id)
        if (uploadError) throw uploadError
        featured_image = uploadData.path
      }

      // Update the blog post while preserving establishment IDs
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          title: data.title,
          content: data.content,
          featured_image,
          published: data.published,
          category: data.category,
          slug: slug(data.title),
          // Preserve establishment IDs
          store_id: currentPost.store_id,
          servicing_id: currentPost.servicing_id,
          club_id: currentPost.club_id,
          range_id: currentPost.range_id,
        })
        .eq('id', postId)

      if (updateError) throw updateError

      toast({
        title: 'Success',
        description: 'Blog post updated successfully.',
      })

      // Redirect to the updated post with category in the URL
      router.push(`/blog/${data.category}/${slug(data.title)}`)
    } catch (error) {
      console.error('Error updating post:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update blog post. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
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
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''
          }
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={
            editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''
          }
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={setLink}
          className={editor.isActive('link') ? 'bg-accent' : ''}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        {editor.isActive('link') && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeLink}
            className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200"
          >
            <LinkIcon className="h-4 w-4" />
            Remove
          </Button>
        )}
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <BackButton
          label="Back to post"
          href={`/blog/${params.category}/${params.slug}`}
          className="mb-6"
        />

        <Card>
          <CardHeader>
            <CardTitle>Edit Blog Post</CardTitle>
            <CardDescription>
              Update your blog post content and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="news">News</SelectItem>
                          <SelectItem value="guides">Guides</SelectItem>
                        </SelectContent>
                      </Select>
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
                  className="w-full"
                  disabled={
                    isSubmitting || uploadingImage || uploadingContentImage
                  }
                >
                  {isSubmitting || uploadingImage || uploadingContentImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadingImage
                        ? 'Uploading Image...'
                        : uploadingContentImage
                          ? 'Adding Image...'
                          : 'Saving Changes...'}
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Add Link Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Link</DialogTitle>
              <DialogDescription>
                Enter the URL and choose if it should open in a new tab
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-tab"
                  checked={openInNewTab}
                  onCheckedChange={checked =>
                    setOpenInNewTab(checked as boolean)
                  }
                />
                <Label htmlFor="new-tab">Open in new tab</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button onClick={applyLink} disabled={!linkUrl}>
                Add Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Image Alt Text Dialog */}
        <Dialog
          open={imageAltDialogOpen}
          onOpenChange={open => {
            if (!open) {
              setImageAltDialogOpen(false)
              setImageAltText('')
              setPendingImageFile(null)
              setSelectedImage(null)
              setIsEditingExistingImage(false)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditingExistingImage
                  ? 'Edit Image Alt Text'
                  : 'Add Image Alt Text'}
              </DialogTitle>
              <DialogDescription>
                Enter alternative text to describe the image for accessibility
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="alt-text">Alt Text</Label>
                <Input
                  id="alt-text"
                  value={imageAltText}
                  onChange={e => setImageAltText(e.target.value)}
                  placeholder="Describe the image"
                />
              </div>
              {isEditingExistingImage && selectedImage && (
                <div className="relative w-full aspect-video">
                  <img
                    src={selectedImage.src}
                    alt={selectedImage.alt}
                    className="rounded-md object-contain w-full h-full"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPendingImageFile(null)
                    setImageAltText('')
                    setSelectedImage(null)
                    setIsEditingExistingImage(false)
                  }}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleImageInsert}
                disabled={
                  !imageAltText ||
                  (!isEditingExistingImage && uploadingContentImage)
                }
              >
                {!isEditingExistingImage && uploadingContentImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : isEditingExistingImage ? (
                  'Update Alt Text'
                ) : (
                  'Insert Image'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
