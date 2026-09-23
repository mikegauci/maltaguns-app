'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  getLegalPageDefinition,
  isLegalPageSlug,
  type LegalPageSlug,
} from '@/lib/legal-pages'
import { ExternalLink, Loader2 } from 'lucide-react'

const BlogEditor = dynamic(() => import('@/components/blog/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] border rounded-lg flex items-center justify-center text-muted-foreground">
      Loading editor...
    </div>
  ),
})

type LegalPageForm = {
  title: string
  content: string
  effective_date: string
  last_updated: string
}

const emptyForm: LegalPageForm = {
  title: '',
  content: '',
  effective_date: '',
  last_updated: '',
}

export default function EditLegalPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })

  const slugParam = typeof params.slug === 'string' ? params.slug : ''
  const slug = isLegalPageSlug(slugParam) ? slugParam : null

  const [form, setForm] = useState<LegalPageForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchPage = useCallback(async () => {
    if (!slug) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/legal-pages/${slug}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to load legal page')
      }

      const data = await response.json()
      const page = data.page
      setForm({
        title: page.title ?? '',
        content: page.content ?? '',
        effective_date: page.effective_date ?? '',
        last_updated: page.last_updated ?? '',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to load legal page',
      })
    } finally {
      setLoading(false)
    }
  }, [slug, toast])

  useEffect(() => {
    if (isAuthorized && slug) {
      fetchPage()
    } else if (isAuthorized && !slug) {
      setLoading(false)
    }
  }, [isAuthorized, slug, fetchPage])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!slug) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/legal-pages/${slug}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          effective_date: form.effective_date || null,
          last_updated: form.last_updated || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to update legal page')
      }

      toast({
        title: 'Saved',
        description: 'Legal page updated successfully.',
      })
      router.push('/admin/legal')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update legal page',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  if (!slug) {
    return (
      <AdminPageLayout
        title="Legal page not found"
        description="The requested legal page does not exist"
      >
        <Button variant="outline" asChild>
          <Link href="/admin/legal">Back to legal pages</Link>
        </Button>
      </AdminPageLayout>
    )
  }

  const definition = getLegalPageDefinition(slug)

  if (loading) {
    return <AdminLoadingState message="Loading legal page..." />
  }

  return (
    <AdminPageLayout
      title={`Edit ${form.title}`}
      description={`Update content for ${definition.path}`}
    >
      <Card>
        <CardHeader>
          <CardTitle>Page content</CardTitle>
          <CardDescription>
            Slug: {slug}. SEO title and description are managed in SEO Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={form.effective_date}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      effective_date: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_updated">Last updated</Label>
                <Input
                  id="last_updated"
                  type="date"
                  value={form.last_updated}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      last_updated: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <BlogEditor
                key={`${slug}-ready`}
                initialContent={form.content}
                onChange={content =>
                  setForm(current => ({
                    ...current,
                    content,
                  }))
                }
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link
                  href={definition.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/legal">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
