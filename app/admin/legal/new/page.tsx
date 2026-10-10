'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { slugifyLegalTitle } from '@/lib/legal-pages'
import { Loader2 } from 'lucide-react'

const BlogEditor = dynamic(() => import('@/components/blog/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] border rounded-lg flex items-center justify-center text-muted-foreground">
      Loading editor...
    </div>
  ),
})

export default function NewLegalPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [content, setContent] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/legal-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          content,
          effective_date: effectiveDate || null,
          last_updated: lastUpdated || null,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to create legal page')
      }
      toast({
        title: 'Created',
        description: 'Legal page created and added to the footer.',
      })
      router.push('/admin/legal')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create legal page',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  return (
    <AdminPageLayout
      title="Add legal page"
      description="New pages are published at /legal/<slug> and linked in the footer automatically"
    >
      <Card>
        <CardHeader>
          <CardTitle>Page content</CardTitle>
          <CardDescription>
            Custom legal pages are not indexed by search engines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={event => {
                    setTitle(event.target.value)
                    if (!slugTouched) {
                      setSlug(slugifyLegalTitle(event.target.value))
                    }
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={event => {
                    setSlugTouched(true)
                    setSlug(event.target.value)
                  }}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={effectiveDate}
                  onChange={event => setEffectiveDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_updated">Last updated</Label>
                <Input
                  id="last_updated"
                  type="date"
                  value={lastUpdated}
                  onChange={event => setLastUpdated(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <BlogEditor initialContent="" onChange={setContent} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create page'
                )}
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
