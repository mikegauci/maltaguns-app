'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import slug from 'slug'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { useFeaturedImageUpload } from '@/hooks/useFeaturedImageUpload'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { HelpTab } from '@/lib/help-center'

const BlogEditor = dynamic(() => import('@/components/blog/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] border rounded-lg flex items-center justify-center text-muted-foreground">
      Loading editor...
    </div>
  ),
})

const guideSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  featuredImage: z.string().optional(),
  metaDescription: z.string().optional(),
  tabId: z.string().min(1, 'Please select a tab'),
  published: z.boolean(),
})

type GuideForm = z.infer<typeof guideSchema>

export default function CreateHelpGuidePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })

  const [tabs, setTabs] = useState<HelpTab[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingContentImage, setUploadingContentImage] = useState(false)

  const form = useForm<GuideForm>({
    resolver: zodResolver(guideSchema),
    defaultValues: {
      title: '',
      content: '',
      featuredImage: '',
      metaDescription: '',
      tabId: '',
      published: false,
    },
  })

  const { uploadingImage, handleImageUpload } = useFeaturedImageUpload({
    supabase,
    toast,
    onUploaded: url => form.setValue('featuredImage', url),
  })

  useEffect(() => {
    async function loadTabs() {
      if (!isAuthorized) return
      const { data, error } = await supabase
        .from('help_tabs')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load help tabs.',
        })
      } else {
        setTabs(data ?? [])
        if (data?.[0]) {
          form.setValue('tabId', data[0].id)
        }
      }
      setLoading(false)
    }

    if (isAuthorized) {
      loadTabs()
    }
  }, [isAuthorized, supabase, toast, form])

  async function onSubmit(data: GuideForm) {
    setSubmitting(true)
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Not authenticated')
      }

      const postSlug = slug(data.title)
      const postData = {
        title: data.title,
        content: data.content,
        featured_image: data.featuredImage || null,
        published: data.published,
        category: 'guides',
        author_id: session.user.id,
        slug: postSlug,
        view_count: 0,
        meta_description: data.metaDescription?.trim() || null,
      }

      const { data: post, error: createError } = await supabase
        .from('blog_posts')
        .insert([postData as never])
        .select('id')
        .single()

      if (createError) {
        throw createError
      }

      const tabAssignments = await supabase
        .from('help_tab_guides')
        .select('sort_order')
        .eq('tab_id', data.tabId)

      const sortOrder = tabAssignments.data?.length ?? 0

      const { error: assignError } = await supabase
        .from('help_tab_guides')
        .insert({
          tab_id: data.tabId,
          blog_post_id: post.id,
          sort_order: sortOrder,
        })

      if (assignError) {
        throw assignError
      }

      toast({
        title: 'Success',
        description: 'Help guide created successfully.',
      })

      router.push('/admin/help/guides')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create guide. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  if (loading) {
    return <AdminLoadingState message="Loading..." />
  }

  return (
    <AdminPageLayout
      title="Create Help Guide"
      description="Create a new guide and assign it to a Help Center tab"
    >
      <Card>
        <CardHeader>
          <CardTitle>Guide Details</CardTitle>
          <CardDescription>
            This creates a blog post with category &quot;guides&quot;
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
                      <Input placeholder="Guide title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Short description shown on the Help Center card"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tabId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Help Tab</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tab" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tabs.map(tab => (
                          <SelectItem key={tab.id} value={tab.id}>
                            {tab.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        {uploadingImage ? (
                          <p className="text-sm text-muted-foreground">
                            Uploading image...
                          </p>
                        ) : null}
                        {field.value ? (
                          <img
                            src={field.value}
                            alt="Featured image preview"
                            className="w-full max-h-[300px] object-cover rounded-lg"
                          />
                        ) : null}
                      </div>
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
                        autofocus
                        onChange={html => form.setValue('content', html)}
                        onUploadingChange={setUploadingContentImage}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <Label htmlFor="published">Published</Label>
                      <Switch
                        id="published"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/help/guides')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submitting || uploadingImage || uploadingContentImage
                  }
                >
                  {submitting || uploadingImage || uploadingContentImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Create Guide'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
