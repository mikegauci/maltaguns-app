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
  const [uploadingImage, setUploadingImage] = useState(false)
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
          console.log('No session found')
          return
        }

        // First check URL parameter (for backward compatibility)
        const searchParams = new URLSearchParams(window.location.search)
        const urlStoreId = searchParams.get('store_id')
        const urlServicingId = searchParams.get('servicing_id')
        const urlClubId = searchParams.get('club_id')
        const urlRangeId = searchParams.get('range_id')

        if (urlStoreId) {
          console.log('Store ID from URL:', urlStoreId)
          setStoreId(urlStoreId)
          return
        } else if (urlServicingId) {
          console.log('Servicing ID from URL:', urlServicingId)
          setServicingId(urlServicingId)
          return
        } else if (urlClubId) {
          console.log('Club ID from URL:', urlClubId)
          setClubId(urlClubId)
          return
        } else if (urlRangeId) {
          console.log('Range ID from URL:', urlRangeId)
          setRangeId(urlRangeId)
          return
        }

        // If no ID in URL, check if user owns an establishment
        const { data: stores, error: storesError } = await supabase
          .from('stores')
          .select('id, business_name, slug')
          .eq('owner_id', session.user.id)
          .limit(1)
          .single()

        if (!storesError && stores) {
          console.log('User store found:', stores)
          setStoreId(stores.id)
          return
        }

        // If no store found, check if user owns a servicing business
        const { data: servicing, error: servicingError } = await supabase
          .from('servicing')
          .select('id, business_name, slug')
          .eq('owner_id', session.user.id)
          .limit(1)
          .single()

        if (!servicingError && servicing) {
          console.log('User servicing business found:', servicing)
          setServicingId(servicing.id)
          return
        }

        // If no servicing found, check if user owns a club
        const { data: club, error: clubError } = await supabase
          .from('clubs')
          .select('id, business_name, slug')
          .eq('owner_id', session.user.id)
          .limit(1)
          .single()

        if (!clubError && club) {
          console.log('User club found:', club)
          setClubId(club.id)
          return
        }

        // If no club found, check if user owns a range
        const { data: range, error: rangeError } = await supabase
          .from('ranges')
          .select('id, business_name, slug')
          .eq('owner_id', session.user.id)
          .limit(1)
          .single()

        if (!rangeError && range) {
          console.log('User range found:', range)
          setRangeId(range.id)
          return
        }

        console.log('User does not own any establishment')
      } catch (error) {
        console.error('Error checking user establishments:', error)
      }
    }

    checkUserStore()
  }, [supabase])

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

        // Check if user is an admin using database field
        let isAdmin = false
        let hasEstablishment = false

        // Check admin status from database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        if (!profileError && profile && profile.is_admin) {
          isAdmin = true
          console.log('User is admin (from database)')
        }

        if (!isAdmin) {
          // Check if user has any establishment
          console.log('Checking if user has establishments...')

          // Check if user has a store
          const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_id', session.user.id)
            .maybeSingle()

          if (storeError) {
            console.error('Error checking store ownership:', storeError)
          } else if (store) {
            console.log('User has a store')
            hasEstablishment = true
          }

          // Check if user has a club
          if (!hasEstablishment) {
            const { data: club, error: clubError } = await supabase
              .from('clubs')
              .select('id')
              .eq('owner_id', session.user.id)
              .maybeSingle()

            if (clubError) {
              console.error('Error checking club ownership:', clubError)
            } else if (club) {
              console.log('User has a club')
              hasEstablishment = true
            }
          }

          // Check if user has a range
          if (!hasEstablishment) {
            const { data: range, error: rangeError } = await supabase
              .from('ranges')
              .select('id')
              .eq('owner_id', session.user.id)
              .maybeSingle()

            if (rangeError) {
              console.error('Error checking range ownership:', rangeError)
            } else if (range) {
              console.log('User has a range')
              hasEstablishment = true
            }
          }

          // Check if user has a servicing business
          if (!hasEstablishment) {
            const { data: servicing, error: servicingError } = await supabase
              .from('servicing')
              .select('id')
              .eq('owner_id', session.user.id)
              .maybeSingle()

            if (servicingError) {
              console.error(
                'Error checking servicing ownership:',
                servicingError
              )
            } else if (servicing) {
              console.log('User has a servicing business')
              hasEstablishment = true
            }
          }
        }

        if (isAdmin || hasEstablishment) {
          console.log(
            `User authorized: ${isAdmin ? 'Admin' : 'Establishment owner'}`
          )
          if (mounted) {
            setIsAuthorized(true)
            setIsLoading(false)
          }
        } else {
          console.log('User not authorized')
          toast({
            variant: 'destructive',
            title: 'Unauthorized',
            description: 'You are not authorized to create blog posts.',
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

  // Get store_id from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const storeIdParam = searchParams.get('store_id')
    const servicingIdParam = searchParams.get('servicing_id')
    const clubIdParam = searchParams.get('club_id')
    const rangeIdParam = searchParams.get('range_id')

    if (storeIdParam) {
      console.log('Store ID from URL:', storeIdParam)
      setStoreId(storeIdParam)
    } else if (servicingIdParam) {
      console.log('Servicing ID from URL:', servicingIdParam)
      setServicingId(servicingIdParam)
    } else if (clubIdParam) {
      console.log('Club ID from URL:', clubIdParam)
      setClubId(clubIdParam)
    } else if (rangeIdParam) {
      console.log('Range ID from URL:', rangeIdParam)
      setRangeId(rangeIdParam)
    } else {
      console.log('No establishment ID found in URL')
    }
  }, [])

  const form = useForm<BlogPostForm>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      content: '',
      featuredImage: '',
      category: undefined,
    },
  })

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
