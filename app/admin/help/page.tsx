'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import slug from 'slug'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { FormDialog } from '@/app/admin/components/FormDialog'
import { ConfirmDialog } from '@/app/admin/components/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowDown,
  ArrowUp,
  Edit,
  HelpCircle,
  LayoutGrid,
  MessageCircleQuestion,
  Plus,
  Trash2,
} from 'lucide-react'
import type { HelpFaqItem, HelpTab } from '@/lib/help-center'
import { AdminStatCard } from '@/app/admin/components/AdminStatCard'

const BlogEditor = dynamic(() => import('@/components/blog/BlogEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[200px] border rounded-lg flex items-center justify-center text-muted-foreground">
      Loading editor...
    </div>
  ),
})

type TabFormData = {
  title: string
  slug: string
  section_title: string
  section_description: string
  banner_text: string
  sort_order: number
  published: boolean
}

type FaqFormData = {
  tab_id: string
  question: string
  answer: string
  sort_order: number
  published: boolean
}

const emptyTabForm: TabFormData = {
  title: '',
  slug: '',
  section_title: '',
  section_description: '',
  banner_text: '',
  sort_order: 0,
  published: true,
}

const emptyFaqForm: FaqFormData = {
  tab_id: '',
  question: '',
  answer: '',
  sort_order: 0,
  published: true,
}

export default function AdminHelpPage() {
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const { isAuthorized, isChecking } = useRequireAdmin({
    preset: 'admin-silent',
  })

  const [tabs, setTabs] = useState<HelpTab[]>([])
  const [faqs, setFaqs] = useState<HelpFaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [faqTabFilter, setFaqTabFilter] = useState<string>('all')

  const [isTabDialogOpen, setIsTabDialogOpen] = useState(false)
  const [isTabDeleteOpen, setIsTabDeleteOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<HelpTab | null>(null)
  const [tabForm, setTabForm] = useState<TabFormData>(emptyTabForm)
  const [tabSubmitting, setTabSubmitting] = useState(false)

  const [isFaqDialogOpen, setIsFaqDialogOpen] = useState(false)
  const [isFaqDeleteOpen, setIsFaqDeleteOpen] = useState(false)
  const [selectedFaq, setSelectedFaq] = useState<HelpFaqItem | null>(null)
  const [faqForm, setFaqForm] = useState<FaqFormData>(emptyFaqForm)
  const [faqSubmitting, setFaqSubmitting] = useState(false)
  const [faqEditorKey, setFaqEditorKey] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [
      { data: tabsData, error: tabsError },
      { data: faqsData, error: faqsError },
    ] = await Promise.all([
      supabase
        .from('help_tabs')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('help_faq_items')
        .select('*')
        .order('sort_order', { ascending: true }),
    ])

    if (tabsError || faqsError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load help center content.',
      })
    } else {
      setTabs(tabsData ?? [])
      setFaqs(faqsData ?? [])
    }
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    if (isAuthorized) {
      fetchData()
    }
  }, [isAuthorized, fetchData])

  const filteredFaqs = useMemo(() => {
    if (faqTabFilter === 'all') return faqs
    return faqs.filter(faq => faq.tab_id === faqTabFilter)
  }, [faqs, faqTabFilter])

  const tabTitleById = useMemo(() => {
    return new Map(tabs.map(tab => [tab.id, tab.title]))
  }, [tabs])

  const stats = useMemo(() => {
    const publishedTabs = tabs.filter(tab => tab.published).length
    const publishedFaqs = faqs.filter(faq => faq.published).length
    return {
      tabs: tabs.length,
      publishedTabs,
      faqs: faqs.length,
      publishedFaqs,
    }
  }, [tabs, faqs])

  function openCreateTab() {
    setSelectedTab(null)
    setTabForm({
      ...emptyTabForm,
      sort_order: tabs.length,
    })
    setIsTabDialogOpen(true)
  }

  function openEditTab(tab: HelpTab) {
    setSelectedTab(tab)
    setTabForm({
      title: tab.title,
      slug: tab.slug,
      section_title: tab.section_title,
      section_description: tab.section_description,
      banner_text: tab.banner_text ?? '',
      sort_order: tab.sort_order,
      published: tab.published,
    })
    setIsTabDialogOpen(true)
  }

  function openDeleteTab(tab: HelpTab) {
    setSelectedTab(tab)
    setIsTabDeleteOpen(true)
  }

  async function handleTabSubmit() {
    if (!tabForm.title.trim() || !tabForm.section_title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Title and section title are required.',
      })
      return
    }

    const slugValue = tabForm.slug.trim() || slug(tabForm.title)
    setTabSubmitting(true)

    const payload = {
      title: tabForm.title.trim(),
      slug: slugValue,
      section_title: tabForm.section_title.trim(),
      section_description: tabForm.section_description.trim(),
      banner_text: tabForm.banner_text.trim() || null,
      sort_order: tabForm.sort_order,
      published: tabForm.published,
    }

    const { error } = selectedTab
      ? await supabase
          .from('help_tabs')
          .update(payload)
          .eq('id', selectedTab.id)
      : await supabase.from('help_tabs').insert(payload)

    setTabSubmitting(false)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
      return
    }

    toast({ title: 'Success', description: 'Tab saved successfully.' })
    setIsTabDialogOpen(false)
    fetchData()
  }

  async function handleTabDelete() {
    if (!selectedTab) return
    setTabSubmitting(true)
    const { error } = await supabase
      .from('help_tabs')
      .delete()
      .eq('id', selectedTab.id)
    setTabSubmitting(false)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
      return
    }

    toast({ title: 'Deleted', description: 'Tab removed successfully.' })
    setIsTabDeleteOpen(false)
    fetchData()
  }

  async function moveTab(tab: HelpTab, direction: 'up' | 'down') {
    const index = tabs.findIndex(item => item.id === tab.id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= tabs.length) return

    const other = tabs[swapIndex]
    const updates = [
      supabase
        .from('help_tabs')
        .update({ sort_order: other.sort_order })
        .eq('id', tab.id),
      supabase
        .from('help_tabs')
        .update({ sort_order: tab.sort_order })
        .eq('id', other.id),
    ]

    const results = await Promise.all(updates)
    if (results.some(result => result.error)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reorder tabs.',
      })
      return
    }
    fetchData()
  }

  function openCreateFaq() {
    setSelectedFaq(null)
    setFaqForm({
      ...emptyFaqForm,
      tab_id: faqTabFilter !== 'all' ? faqTabFilter : (tabs[0]?.id ?? ''),
      sort_order: faqs.filter(
        faq =>
          faq.tab_id === (faqTabFilter !== 'all' ? faqTabFilter : tabs[0]?.id)
      ).length,
    })
    setFaqEditorKey(prev => prev + 1)
    setIsFaqDialogOpen(true)
  }

  function openEditFaq(faq: HelpFaqItem) {
    setSelectedFaq(faq)
    setFaqForm({
      tab_id: faq.tab_id,
      question: faq.question,
      answer: faq.answer,
      sort_order: faq.sort_order,
      published: faq.published,
    })
    setFaqEditorKey(prev => prev + 1)
    setIsFaqDialogOpen(true)
  }

  function openDeleteFaq(faq: HelpFaqItem) {
    setSelectedFaq(faq)
    setIsFaqDeleteOpen(true)
  }

  async function handleFaqSubmit() {
    if (!faqForm.tab_id || !faqForm.question.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Tab and question are required.',
      })
      return
    }

    setFaqSubmitting(true)
    const payload = {
      tab_id: faqForm.tab_id,
      question: faqForm.question.trim(),
      answer: faqForm.answer,
      sort_order: faqForm.sort_order,
      published: faqForm.published,
    }

    const { error } = selectedFaq
      ? await supabase
          .from('help_faq_items')
          .update(payload)
          .eq('id', selectedFaq.id)
      : await supabase.from('help_faq_items').insert(payload)

    setFaqSubmitting(false)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
      return
    }

    toast({ title: 'Success', description: 'FAQ saved successfully.' })
    setIsFaqDialogOpen(false)
    fetchData()
  }

  async function handleFaqDelete() {
    if (!selectedFaq) return
    setFaqSubmitting(true)
    const { error } = await supabase
      .from('help_faq_items')
      .delete()
      .eq('id', selectedFaq.id)
    setFaqSubmitting(false)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
      return
    }

    toast({ title: 'Deleted', description: 'FAQ removed successfully.' })
    setIsFaqDeleteOpen(false)
    fetchData()
  }

  async function moveFaq(faq: HelpFaqItem, direction: 'up' | 'down') {
    const tabFaqs = faqs
      .filter(item => item.tab_id === faq.tab_id)
      .sort((a, b) => a.sort_order - b.sort_order)
    const index = tabFaqs.findIndex(item => item.id === faq.id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= tabFaqs.length) return

    const other = tabFaqs[swapIndex]
    const results = await Promise.all([
      supabase
        .from('help_faq_items')
        .update({ sort_order: other.sort_order })
        .eq('id', faq.id),
      supabase
        .from('help_faq_items')
        .update({ sort_order: faq.sort_order })
        .eq('id', other.id),
    ])

    if (results.some(result => result.error)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reorder FAQ.',
      })
      return
    }
    fetchData()
  }

  if (isChecking || !isAuthorized) {
    return <AdminLoadingState />
  }

  if (loading) {
    return <AdminLoadingState message="Loading help center..." />
  }

  return (
    <AdminPageLayout
      title="Help Center"
      description="Manage help tabs and FAQ accordion content"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Help Tabs"
          value={stats.tabs}
          subtitle={`${stats.publishedTabs} published`}
          icon={LayoutGrid}
        />
        <AdminStatCard
          label="FAQ Items"
          value={stats.faqs}
          subtitle={`${stats.publishedFaqs} published`}
          icon={MessageCircleQuestion}
        />
        <AdminStatCard
          label="Live on /help"
          value={stats.publishedTabs}
          subtitle="Visible tabs"
          icon={HelpCircle}
        />
        <AdminStatCard
          label="Draft FAQs"
          value={stats.faqs - stats.publishedFaqs}
          subtitle="Hidden from public"
          icon={MessageCircleQuestion}
        />
      </div>

      <Tabs defaultValue="tabs">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tabs">Tabs</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>

        <TabsContent value="tabs" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Help Tabs</CardTitle>
                <CardDescription>
                  Add, edit, or remove tabs shown on the Help Center page
                </CardDescription>
              </div>
              <Button onClick={openCreateTab}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tab
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {tabs.map((tab, index) => {
                  const faqCount = faqs.filter(
                    faq => faq.tab_id === tab.id
                  ).length

                  return (
                    <div
                      key={tab.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-foreground">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{tab.title}</p>
                            <Badge
                              variant={tab.published ? 'default' : 'secondary'}
                            >
                              {tab.published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground truncate">
                            {tab.section_title} · /help#{tab.slug}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {faqCount} FAQ{faqCount === 1 ? '' : 's'}
                            {tab.banner_text ? ' · Has disclaimer banner' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === 0}
                          onClick={() => moveTab(tab, 'up')}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === tabs.length - 1}
                          onClick={() => moveTab(tab, 'down')}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditTab(tab)}
                        >
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => openDeleteTab(tab)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>FAQ Items</CardTitle>
                <CardDescription>
                  Manage accordion questions and answers for each tab
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={faqTabFilter} onValueChange={setFaqTabFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by tab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tabs</SelectItem>
                    {tabs.map(tab => (
                      <SelectItem key={tab.id} value={tab.id}>
                        {tab.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={openCreateFaq} disabled={!tabs.length}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="rounded-xl border border-dashed py-12 text-center">
                  <MessageCircleQuestion className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">No FAQ items found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a FAQ or change your tab filter.
                  </p>
                </div>
              ) : (
                filteredFaqs.map(faq => {
                  const tabFaqs = faqs
                    .filter(item => item.tab_id === faq.tab_id)
                    .sort((a, b) => a.sort_order - b.sort_order)
                  const tabIndex = tabFaqs.findIndex(item => item.id === faq.id)

                  return (
                    <div
                      key={faq.id}
                      className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={tabIndex === 0}
                            onClick={() => moveFaq(faq, 'up')}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={tabIndex === tabFaqs.length - 1}
                            onClick={() => moveFaq(faq, 'down')}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="outline">
                              {tabTitleById.get(faq.tab_id) ?? 'Tab'}
                            </Badge>
                            <Badge
                              variant={faq.published ? 'default' : 'secondary'}
                            >
                              {faq.published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                          <p className="font-medium leading-snug">
                            {faq.question}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditFaq(faq)}
                        >
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => openDeleteFaq(faq)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialog
        title={selectedTab ? 'Edit Tab' : 'Add Tab'}
        description="Configure a help center tab"
        isOpen={isTabDialogOpen}
        onClose={() => setIsTabDialogOpen(false)}
        onSubmit={handleTabSubmit}
        isSubmitting={tabSubmitting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tab-title">Tab Title</Label>
            <Input
              id="tab-title"
              value={tabForm.title}
              onChange={e => {
                const title = e.target.value
                setTabForm(prev => ({
                  ...prev,
                  title,
                  slug: selectedTab ? prev.slug : slug(title),
                }))
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tab-slug">Slug</Label>
            <Input
              id="tab-slug"
              value={tabForm.slug}
              onChange={e =>
                setTabForm(prev => ({ ...prev, slug: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-title">Section Title</Label>
            <Input
              id="section-title"
              value={tabForm.section_title}
              onChange={e =>
                setTabForm(prev => ({
                  ...prev,
                  section_title: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-description">Section Description</Label>
            <Textarea
              id="section-description"
              value={tabForm.section_description}
              onChange={e =>
                setTabForm(prev => ({
                  ...prev,
                  section_description: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-text">Banner Text (optional)</Label>
            <Textarea
              id="banner-text"
              value={tabForm.banner_text}
              onChange={e =>
                setTabForm(prev => ({ ...prev, banner_text: e.target.value }))
              }
              placeholder="Disclaimer or notice shown at the top of this tab"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tab-sort">Sort Order</Label>
            <Input
              id="tab-sort"
              type="number"
              value={tabForm.sort_order}
              onChange={e =>
                setTabForm(prev => ({
                  ...prev,
                  sort_order: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="tab-published">Published</Label>
            <Switch
              id="tab-published"
              checked={tabForm.published}
              onCheckedChange={checked =>
                setTabForm(prev => ({ ...prev, published: checked }))
              }
            />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        title={selectedFaq ? 'Edit FAQ' : 'Add FAQ'}
        description="Configure an accordion FAQ item"
        isOpen={isFaqDialogOpen}
        onClose={() => setIsFaqDialogOpen(false)}
        onSubmit={handleFaqSubmit}
        isSubmitting={faqSubmitting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tab</Label>
            <Select
              value={faqForm.tab_id}
              onValueChange={value =>
                setFaqForm(prev => ({ ...prev, tab_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tab" />
              </SelectTrigger>
              <SelectContent>
                {tabs.map(tab => (
                  <SelectItem key={tab.id} value={tab.id}>
                    {tab.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-question">Question</Label>
            <Input
              id="faq-question"
              value={faqForm.question}
              onChange={e =>
                setFaqForm(prev => ({ ...prev, question: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Answer</Label>
            <BlogEditor
              key={faqEditorKey}
              initialContent={faqForm.answer}
              onChange={html => setFaqForm(prev => ({ ...prev, answer: html }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faq-sort">Sort Order</Label>
            <Input
              id="faq-sort"
              type="number"
              value={faqForm.sort_order}
              onChange={e =>
                setFaqForm(prev => ({
                  ...prev,
                  sort_order: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="faq-published">Published</Label>
            <Switch
              id="faq-published"
              checked={faqForm.published}
              onCheckedChange={checked =>
                setFaqForm(prev => ({ ...prev, published: checked }))
              }
            />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        title="Delete Tab"
        description={`Are you sure you want to delete "${selectedTab?.title}"? All FAQs and guide assignments for this tab will also be removed.`}
        isOpen={isTabDeleteOpen}
        onClose={() => setIsTabDeleteOpen(false)}
        onConfirm={handleTabDelete}
        isLoading={tabSubmitting}
        confirmLabel="Delete"
      />

      <ConfirmDialog
        title="Delete FAQ"
        description={`Are you sure you want to delete "${selectedFaq?.question}"?`}
        isOpen={isFaqDeleteOpen}
        onClose={() => setIsFaqDeleteOpen(false)}
        onConfirm={handleFaqDelete}
        isLoading={faqSubmitting}
        confirmLabel="Delete"
      />
    </AdminPageLayout>
  )
}
