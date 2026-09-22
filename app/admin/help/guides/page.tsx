'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { AdminStatCard } from '@/app/admin/components/AdminStatCard'
import { ConfirmDialog } from '@/app/admin/components/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Edit,
  ExternalLink,
  FileText,
  Layers,
  Plus,
  Search,
  Trash2,
  Unlink,
} from 'lucide-react'
import type { HelpTab } from '@/lib/help-center'

type GuidePost = {
  id: string
  title: string
  slug: string
  published: boolean
  created_at: string
}

type GuideAssignment = {
  id: string
  tab_id: string
  blog_post_id: string
  sort_order: number
}

export default function AdminHelpGuidesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })

  const [guides, setGuides] = useState<GuidePost[]>([])
  const [tabs, setTabs] = useState<HelpTab[]>([])
  const [assignments, setAssignments] = useState<GuideAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tabFilter, setTabFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<GuidePost | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [
      { data: guidesData, error: guidesError },
      { data: tabsData, error: tabsError },
      { data: assignmentsData, error: assignmentsError },
    ] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('id, title, slug, published, created_at')
        .eq('category', 'guides')
        .order('created_at', { ascending: false }),
      supabase
        .from('help_tabs')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('help_tab_guides')
        .select('id, tab_id, blog_post_id, sort_order')
        .order('sort_order', { ascending: true }),
    ])

    if (guidesError || tabsError || assignmentsError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load help guides.',
      })
    } else {
      setGuides(guidesData ?? [])
      setTabs(tabsData ?? [])
      setAssignments(assignmentsData ?? [])
    }
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    if (isAuthorized) {
      fetchData()
    }
  }, [isAuthorized, fetchData])

  const tabTitleById = useMemo(
    () => new Map(tabs.map(tab => [tab.id, tab.title])),
    [tabs]
  )

  const assignmentsByGuide = useMemo(() => {
    const map = new Map<string, GuideAssignment[]>()
    for (const assignment of assignments) {
      const list = map.get(assignment.blog_post_id) ?? []
      list.push(assignment)
      map.set(assignment.blog_post_id, list)
    }
    for (const [guideId, list] of map) {
      map.set(
        guideId,
        [...list].sort((a, b) => a.sort_order - b.sort_order)
      )
    }
    return map
  }, [assignments])

  const stats = useMemo(() => {
    const published = guides.filter(guide => guide.published).length
    const unassigned = guides.filter(
      guide => (assignmentsByGuide.get(guide.id) ?? []).length === 0
    ).length
    return {
      total: guides.length,
      published,
      drafts: guides.length - published,
      unassigned,
    }
  }, [guides, assignmentsByGuide])

  const filteredGuides = useMemo(() => {
    return guides.filter(guide => {
      const term = searchTerm.trim().toLowerCase()
      if (term && !guide.title.toLowerCase().includes(term)) return false

      if (statusFilter === 'published' && !guide.published) return false
      if (statusFilter === 'draft' && guide.published) return false

      if (tabFilter !== 'all') {
        const guideAssignments = assignmentsByGuide.get(guide.id) ?? []
        if (tabFilter === 'unassigned') {
          return guideAssignments.length === 0
        }
        return guideAssignments.some(
          assignment => assignment.tab_id === tabFilter
        )
      }

      return true
    })
  }, [guides, searchTerm, statusFilter, tabFilter, assignmentsByGuide])

  async function handleAssignTab(guideId: string, tabId: string) {
    const alreadyAssigned = (assignmentsByGuide.get(guideId) ?? []).some(
      assignment => assignment.tab_id === tabId
    )
    if (alreadyAssigned) {
      toast({
        variant: 'destructive',
        title: 'Already assigned',
        description: 'This guide is already on that tab.',
      })
      return
    }

    const existing = assignments.filter(
      assignment => assignment.tab_id === tabId
    )
    const sortOrder = existing.length

    const { error } = await supabase.from('help_tab_guides').insert({
      tab_id: tabId,
      blog_post_id: guideId,
      sort_order: sortOrder,
    })

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
      return
    }

    toast({ title: 'Assigned', description: 'Guide added to tab.' })
    fetchData()
  }

  async function handleUnassign(assignmentId: string) {
    const { error } = await supabase
      .from('help_tab_guides')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
      return
    }

    toast({ title: 'Removed', description: 'Guide removed from tab.' })
    fetchData()
  }

  async function moveAssignment(
    assignment: GuideAssignment,
    direction: 'up' | 'down'
  ) {
    const tabAssignments = (
      assignmentsByGuide.get(assignment.blog_post_id) ?? []
    )
      .filter(item => item.tab_id === assignment.tab_id)
      .sort((a, b) => a.sort_order - b.sort_order)

    const index = tabAssignments.findIndex(item => item.id === assignment.id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= tabAssignments.length) return

    const other = tabAssignments[swapIndex]
    const results = await Promise.all([
      supabase
        .from('help_tab_guides')
        .update({ sort_order: other.sort_order })
        .eq('id', assignment.id),
      supabase
        .from('help_tab_guides')
        .update({ sort_order: assignment.sort_order })
        .eq('id', other.id),
    ])

    if (results.some(result => result.error)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reorder guide.',
      })
      return
    }
    fetchData()
  }

  async function handleDeleteGuide() {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      const response = await fetch('/api/admin/blogs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: deleteTarget.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete guide')
      }

      toast({ title: 'Deleted', description: 'Guide deleted successfully.' })
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete guide.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  if (loading) {
    return <AdminLoadingState message="Loading help guides..." />
  }

  return (
    <AdminPageLayout
      title="Help Guides"
      description="Create guides and assign them to Help Center tabs"
      actionButton={{
        label: 'Create Guide',
        icon: Plus,
        onClick: () => router.push('/admin/help/guides/create'),
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Total Guides"
          value={stats.total}
          subtitle="All help guide posts"
          icon={BookOpen}
        />
        <AdminStatCard
          label="Published"
          value={stats.published}
          subtitle="Visible on /blog/guides"
          icon={FileText}
        />
        <AdminStatCard
          label="Drafts"
          value={stats.drafts}
          subtitle="Not yet published"
          icon={Layers}
        />
        <AdminStatCard
          label="Unassigned"
          value={stats.unassigned}
          subtitle="Not shown on Help Center"
          icon={AlertCircle}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Guides</CardTitle>
          <CardDescription>
            Search and narrow down guides by tab or status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search guides..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tabFilter} onValueChange={setTabFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by tab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tabs</SelectItem>
                <SelectItem value="unassigned">Unassigned only</SelectItem>
                {tabs.map(tab => (
                  <SelectItem key={tab.id} value={tab.id}>
                    {tab.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredGuides.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No guides found</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {guides.length === 0
                ? 'Create your first help guide to show it on the Help Center.'
                : 'Try adjusting your search or filters.'}
            </p>
            {guides.length === 0 ? (
              <Button
                className="mt-6"
                onClick={() => router.push('/admin/help/guides/create')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Guide
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredGuides.map(guide => {
            const guideAssignments = assignmentsByGuide.get(guide.id) ?? []
            const isUnassigned = guideAssignments.length === 0

            return (
              <Card
                key={guide.id}
                className="transition-shadow hover:shadow-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="rounded-lg bg-muted p-2.5 shrink-0">
                        <FileText className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg leading-snug">
                          {guide.title}
                        </CardTitle>
                        <CardDescription className="mt-1 truncate">
                          /blog/guides/{guide.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={guide.published ? 'default' : 'secondary'}>
                      {guide.published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {isUnassigned ? (
                    <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Not assigned to any tab — won&apos;t appear on the Help
                        Center.
                      </span>
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Help Center Tabs
                    </p>
                    <div className="space-y-2">
                      {guideAssignments.map(assignment => {
                        const tabAssignments = guideAssignments.filter(
                          item => item.tab_id === assignment.tab_id
                        )
                        const tabIndex = tabAssignments.findIndex(
                          item => item.id === assignment.id
                        )

                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2"
                          >
                            <span className="truncate text-sm font-medium">
                              {tabTitleById.get(assignment.tab_id) ?? 'Tab'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={tabIndex === 0}
                                onClick={() => moveAssignment(assignment, 'up')}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={
                                  tabIndex === tabAssignments.length - 1
                                }
                                onClick={() =>
                                  moveAssignment(assignment, 'down')
                                }
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleUnassign(assignment.id)}
                              >
                                <Unlink className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add to tab
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-56 p-2">
                        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          Choose a tab
                        </p>
                        {tabs.map(tab => {
                          const isAssigned = guideAssignments.some(
                            assignment => assignment.tab_id === tab.id
                          )
                          return (
                            <Button
                              key={tab.id}
                              variant="ghost"
                              size="sm"
                              disabled={isAssigned}
                              className="w-full justify-start"
                              onClick={() => handleAssignTab(guide.id, tab.id)}
                            >
                              {tab.title}
                              {isAssigned ? (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  Added
                                </span>
                              ) : null}
                            </Button>
                          )
                        })}
                      </PopoverContent>
                    </Popover>

                    <div className="ml-auto flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/blog/guides/${guide.slug}`}
                          target="_blank"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/blog/guides/${guide.slug}/edit`}>
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => setDeleteTarget(guide)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        title="Delete Guide"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This will remove the blog post and all tab assignments.`}
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteGuide}
        isLoading={isDeleting}
        confirmLabel="Delete"
      />
    </AdminPageLayout>
  )
}
