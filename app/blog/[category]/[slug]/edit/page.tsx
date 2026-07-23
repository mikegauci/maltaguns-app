'use client'

import { useState, useEffect, use } from 'react'
import dynamic from 'next/dynamic'
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
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { resizeImageForUpload } from '@/lib/image-resize'
import { BackButton } from '@/components/ui/back-button'
import { PageLayout } from '@/components/ui/page-layout'
import { Loader2 } from 'lucide-react'
import slug from 'slug'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const BlogEditor = dynamic(() => import('@/components/blog/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] border rounded-lg flex items-center justify-center text-muted-foreground">
      Loading editor...
    </div>
  ),
})

const MAX_FILE_SIZE = 5 * 1024 * 1024
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
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function EditBlogPost(props: {
  params: Promise<{ category: string; slug: string }>
}) {
  const params = use(props.params)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [postId, setPostId] = useState<string | null>(null)
  const [uploadingContentImage, setUploadingContentImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialContent, setInitialContent] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      featuredImage: '',
      published: false,
      category: 'news',
      meta_title: '',
      meta_description: '',
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

        const sessionExpiry = new Date(session.expires_at! * 1000)
        const now = new Date()
        const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
        const isNearExpiry = timeUntilExpiry < 5 * 60 * 1000

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
            meta_title: (post as any).meta_title || '',
            meta_description: (post as any).meta_description || '',
          })
          setInitialContent(post.content)
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

    loadPost()

    return () => {
      mounted = false
    }
  }, [params.slug, router, form, supabase, toast])

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

      // Downscale + re-encode to WebP before upload to cut Storage egress.
      const resized = await resizeImageForUpload(file)
      const fileExt = resized.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `blog/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('blog')
        .upload(filePath, resized, {
          // Unique filename per upload (never overwritten) - cache for 1 year.
          cacheControl: '31536000',
          upsert: false,
          contentType: resized.type,
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

      const featured_image = data.featuredImage

      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          title: data.title,
          content: data.content,
          featured_image,
          published: data.published,
          category: data.category,
          slug: slug(data.title),
          meta_title: data.meta_title || null,
          meta_description: data.meta_description || null,
          // Preserve establishment IDs
          store_id: currentPost.store_id,
          servicing_id: currentPost.servicing_id,
          club_id: currentPost.club_id,
          range_id: currentPost.range_id,
        } as any)
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

  if (isLoading) {
    return (
      <PageLayout>
        <p className="text-muted-foreground">Loading...</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="mb-6">
        <BackButton
          label="Back"
          href={`/blog/${params.category}/${params.slug}`}
          hideLabelOnMobile={false}
        />
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
                name="meta_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Overrides the page title for search engines"
                        maxLength={70}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Overrides the meta description for search engines"
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={() => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <BlogEditor
                        initialContent={initialContent}
                        onChange={html => form.setValue('content', html)}
                        onUploadingChange={setUploadingContentImage}
                      />
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
    </PageLayout>
  )
}
