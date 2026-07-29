'use client'

import { useState, useEffect } from 'react'
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
import {
  findFirstActiveEstablishment,
  isActiveEstablishmentOwnedByUser,
  userHasActiveEstablishment,
} from '@/lib/establishments'
import { useFeaturedImageUpload } from '@/hooks/useFeaturedImageUpload'
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

const blogPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  featuredImage: z.string().optional(),
  category: z.enum(['news', 'guides'], {
    required_error: 'Please select a category',
  }),
})

type BlogPostForm = z.infer<typeof blogPostSchema>

export default function CreateBlogPost() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [uploadingContentImage, setUploadingContentImage] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [servicingId, setServicingId] = useState<string | null>(null)
  const [clubId, setClubId] = useState<string | null>(null)
  const [rangeId, setRangeId] = useState<string | null>(null)

  useEffect(() => {
    async function checkUserStore() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        const isAdmin = !!profile?.is_admin
        const searchParams = new URLSearchParams(window.location.search)
        const urlMappings = [
          { param: 'store_id', table: 'stores' as const, setId: setStoreId },
          {
            param: 'servicing_id',
            table: 'servicing' as const,
            setId: setServicingId,
          },
          { param: 'club_id', table: 'clubs' as const, setId: setClubId },
          { param: 'range_id', table: 'ranges' as const, setId: setRangeId },
        ]

        for (const { param, table, setId } of urlMappings) {
          const establishmentId = searchParams.get(param)
          if (!establishmentId) continue

          if (isAdmin) {
            setId(establishmentId)
            return
          }

          const isValid = await isActiveEstablishmentOwnedByUser(
            supabase,
            table,
            establishmentId,
            session.user.id
          )

          if (isValid) {
            setId(establishmentId)
            return
          }

          toast({
            variant: 'destructive',
            title: 'Invalid establishment',
            description:
              'You can only create blog posts for your active establishments.',
          })
          router.push('/blog')
          return
        }

        if (isAdmin) return

        const activeEstablishment = await findFirstActiveEstablishment(
          supabase,
          session.user.id
        )

        if (!activeEstablishment) return

        if (activeEstablishment.table === 'stores') {
          setStoreId(activeEstablishment.id)
        } else if (activeEstablishment.table === 'servicing') {
          setServicingId(activeEstablishment.id)
        } else if (activeEstablishment.table === 'clubs') {
          setClubId(activeEstablishment.id)
        } else {
          setRangeId(activeEstablishment.id)
        }
      } catch (error) {
        console.error('Error checking user establishments:', error)
      }
    }

    checkUserStore()
  }, [router, supabase, toast])

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
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

        let isAdmin = false

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        if (!profileError && profile?.is_admin) {
          isAdmin = true
        }

        const hasActiveEstablishment = isAdmin
          ? true
          : await userHasActiveEstablishment(supabase, session.user.id)

        if (hasActiveEstablishment) {
          if (mounted) {
            setIsAuthorized(true)
            setIsLoading(false)
          }
        } else {
          toast({
            variant: 'destructive',
            title: 'Unauthorized',
            description:
              'You need an active establishment before you can create blog posts.',
          })
          router.push('/blog')
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

  const form = useForm<BlogPostForm>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      content: '',
      featuredImage: '',
      category: undefined,
    },
  })

  const { uploadingImage, handleImageUpload } = useFeaturedImageUpload({
    supabase,
    toast,
    onUploaded: url => form.setValue('featuredImage', url),
  })

  async function onSubmit(data: BlogPostForm) {
    setIsLoading(true)
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Not authenticated')
      }

      console.log('Creating blog post with establishments:', {
        store_id: storeId,
        servicing_id: servicingId,
        club_id: clubId,
        range_id: rangeId,
      })

      // Create the blog post
      const postData = {
        title: data.title,
        content: data.content,
        featured_image: data.featuredImage,
        published: true,
        category: data.category,
        author_id: session.user.id,
        store_id: storeId,
        servicing_id: servicingId,
        club_id: clubId,
        range_id: rangeId,
        slug: slug(data.title),
        view_count: 0,
      }

      console.log('Post data being sent:', postData)

      const { data: post, error: createError } = await supabase
        .from('blog_posts')
        .insert([postData])
        .select()
        .single()

      if (createError) {
        console.error('Error creating blog post:', createError)
        throw createError
      }

      console.log('Created blog post:', post)

      toast({
        title: 'Success',
        description: 'Blog post created successfully.',
      })

      // Redirect to the new post with category in the URL
      router.push(`/blog/${data.category}/${slug(data.title)}`)
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create blog post. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <PageLayout>
        <p className="text-muted-foreground">Loading...</p>
      </PageLayout>
    )
  }

  if (!isAuthorized) {
    return null // Component will redirect in useEffect
  }

  return (
    <PageLayout>
      <BackButton
        label="Back"
        href="/blog"
        className="mb-6"
        hideLabelOnMobile={false}
      />

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
                render={() => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <BlogEditor
                        autofocus
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
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading || uploadingImage || uploadingContentImage}
              >
                {isLoading || uploadingImage || uploadingContentImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingImage
                      ? 'Uploading Image...'
                      : uploadingContentImage
                        ? 'Adding Image...'
                        : 'Publishing...'}
                  </>
                ) : (
                  'Publish Post'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
