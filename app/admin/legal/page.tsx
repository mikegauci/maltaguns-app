'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { AdminEmptyState } from '@/app/admin/components/AdminEmptyState'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { AdminTableLoader } from '@/components/admin/AdminTableLoader'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  formatLegalDate,
  getLegalPageDefinition,
  type LegalPageSlug,
} from '@/lib/legal-pages'
import { Edit, ExternalLink } from 'lucide-react'

type LegalPageRow = {
  slug: LegalPageSlug
  title: string
  effective_date: string | null
  last_updated: string | null
  updated_at: string
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminLegalPagesPage() {
  const { toast } = useToast()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })
  const [pages, setPages] = useState<LegalPageRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/legal-pages')
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to load legal pages')
      }
      const data = await response.json()
      setPages(data.pages ?? [])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to load legal pages',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (isAuthorized) {
      fetchPages()
    }
  }, [isAuthorized, fetchPages])

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  return (
    <AdminPageLayout
      title="Legal Pages"
      description="Manage policies, terms, and other legal content"
    >
      {loading ? (
        <AdminTableLoader />
      ) : pages.length === 0 ? (
        <AdminEmptyState message="No legal pages found." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map(page => {
                const definition = getLegalPageDefinition(page.slug)
                return (
                  <TableRow key={page.slug}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {page.slug}
                    </TableCell>
                    <TableCell>
                      {formatLegalDate(page.effective_date) ?? '—'}
                    </TableCell>
                    <TableCell>
                      {formatLegalDate(page.last_updated) ?? '—'}
                    </TableCell>
                    <TableCell>{formatTimestamp(page.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/legal/${page.slug}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={definition.path}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Preview
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminPageLayout>
  )
}
