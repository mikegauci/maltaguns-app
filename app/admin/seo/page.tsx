'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  SECTION_GROUPS,
  SECTION_SEO_DEFAULTS,
  getSectionsByGroup,
  type PageSeoMap,
  type SectionKey,
} from '@/lib/seo-defaults'
import { ExternalLink } from 'lucide-react'

type GlobalForm = {
  site_title: string
  site_description: string
  default_og_image: string
  twitter_handle: string
}

const TITLE_MAX = 70
const TITLE_RECOMMENDED = 60
const DESCRIPTION_MAX = 200
const DESCRIPTION_RECOMMENDED = 160

const emptyGlobal: GlobalForm = {
  site_title: '',
  site_description: '',
  default_og_image: '',
  twitter_handle: '',
}

export default SeoPageComponent

function CharCount({
  length,
  recommended,
  max,
}: {
  length: number
  recommended: number
  max: number
}) {
  const overRecommended = length > recommended
  return (
    <p
      className={`text-xs ${
        overRecommended ? 'text-amber-600' : 'text-muted-foreground'
      }`}
    >
      {length}/{max}
      {overRecommended ? ` · over recommended ~${recommended}` : ''}
    </p>
  )
}

function SerpPreview({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  const displayTitle =
    title.length > TITLE_RECOMMENDED
      ? `${title.slice(0, TITLE_RECOMMENDED - 1).trimEnd()}…`
      : title
  const displayDescription =
    description.length > DESCRIPTION_RECOMMENDED
      ? `${description.slice(0, DESCRIPTION_RECOMMENDED - 1).trimEnd()}…`
      : description
  const host =
    typeof window !== 'undefined' ? window.location.host : 'maltaguns.com'
  const pathLabel = path === '/' ? '' : path

  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Search preview
      </p>
      <div className="space-y-1">
        <p className="text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8] line-clamp-1">
          {displayTitle || 'Untitled'}
        </p>
        <p className="text-sm text-[#006621] dark:text-[#81c995]">
          {host}
          {pathLabel}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {displayDescription || 'No description set.'}
        </p>
      </div>
    </div>
  )
}

function mergePageSeoFromSettings(settings: any): PageSeoMap {
  const fromJson = (settings?.page_seo || {}) as PageSeoMap
  const merged: PageSeoMap = { ...fromJson }

  // Legacy flat columns
  const legacy: SectionKey[] = [
    'marketplace',
    'events',
    'blog',
    'establishments',
  ]
  for (const key of legacy) {
    if (merged[key]?.title || merged[key]?.description) continue
    const title = settings?.[`${key}_meta_title`]
    const description = settings?.[`${key}_meta_description`]
    if (title || description) {
      merged[key] = { title: title || null, description: description || null }
    }
  }

  return merged
}

function SeoPageComponent() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalForm, setGlobalForm] = useState<GlobalForm>(emptyGlobal)
  const [pageSeo, setPageSeo] = useState<PageSeoMap>({})
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [activeTab, setActiveTab] = useState('global')
  const [activePage, setActivePage] = useState<SectionKey>('home')

  const currentSnapshot = useMemo(
    () => JSON.stringify({ globalForm, pageSeo }),
    [globalForm, pageSeo]
  )
  const isDirty = currentSnapshot !== savedSnapshot

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/seo-settings')
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to load SEO settings')
      }

      const data = await response.json()
      const settings = data.settings || {}
      const nextGlobal: GlobalForm = {
        site_title: settings.site_title || '',
        site_description: settings.site_description || '',
        default_og_image: settings.default_og_image || '',
        twitter_handle: settings.twitter_handle || '',
      }
      const nextPageSeo = mergePageSeoFromSettings(settings)
      setGlobalForm(nextGlobal)
      setPageSeo(nextPageSeo)
      setSavedSnapshot(
        JSON.stringify({ globalForm: nextGlobal, pageSeo: nextPageSeo })
      )
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to load SEO settings',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  function updateGlobal(field: keyof GlobalForm, value: string) {
    setGlobalForm(prev => ({ ...prev, [field]: value }))
  }

  function updatePageField(
    key: SectionKey,
    field: 'title' | 'description',
    value: string
  ) {
    setPageSeo(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }))
  }

  function clearPageField(key: SectionKey, field: 'title' | 'description') {
    updatePageField(key, field, '')
  }

  function applyDefault(key: SectionKey, field: 'title' | 'description') {
    const defaults = SECTION_SEO_DEFAULTS[key]
    updatePageField(
      key,
      field,
      field === 'title' ? defaults.title : defaults.description
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/admin/seo-settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...globalForm,
          page_seo: pageSeo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to save SEO settings')
      }

      setSavedSnapshot(currentSnapshot)
      toast({
        title: 'Success',
        description: 'SEO settings updated successfully',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to save SEO settings',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const globalTitle =
    globalForm.site_title.trim() || 'MaltaGuns - Firearms Community Hub'
  const globalDescription =
    globalForm.site_description.trim() ||
    'The premier destination for the firearms community in Malta'

  const previewPageKey: SectionKey | null =
    activeTab === 'global'
      ? null
      : getSectionsByGroup(activeTab).includes(activePage)
        ? activePage
        : getSectionsByGroup(activeTab)[0] || null

  const previewDefaults = previewPageKey
    ? SECTION_SEO_DEFAULTS[previewPageKey]
    : null
  const previewOverride = previewPageKey ? pageSeo[previewPageKey] || {} : null

  const previewTitle =
    activeTab === 'global'
      ? globalTitle
      : previewOverride?.title?.trim() ||
        (previewPageKey === 'home' ? globalTitle : previewDefaults?.title) ||
        globalTitle

  const previewDescription =
    activeTab === 'global'
      ? globalDescription
      : previewOverride?.description?.trim() ||
        (previewPageKey === 'home'
          ? globalDescription
          : previewDefaults?.description) ||
        globalDescription

  const previewPath =
    activeTab === 'global' ? '/' : previewDefaults?.path || '/'

  return (
    <PageLayout>
      <PageHeader
        title="SEO Settings"
        description="Manage global defaults and per-page meta title/description overrides"
      />
      <BackButton label="Back to Dashboard" href="/admin" />

      {isLoading ? (
        <div className="w-full flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-start">
            <div className="min-w-0 space-y-4">
              <Tabs
                value={activeTab}
                onValueChange={value => {
                  setActiveTab(value)
                  if (value !== 'global') {
                    const first = getSectionsByGroup(value)[0]
                    if (first) setActivePage(first)
                  }
                }}
              >
                <TabsList className="w-full h-auto flex flex-wrap justify-start gap-1">
                  <TabsTrigger value="global">Global</TabsTrigger>
                  {SECTION_GROUPS.map(group => (
                    <TabsTrigger key={group} value={group}>
                      {group}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="global" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Global SEO Defaults</CardTitle>
                      <CardDescription>
                        Fallbacks for the homepage and pages without their own
                        override.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="site_title">Site Title</Label>
                        <Input
                          id="site_title"
                          value={globalForm.site_title}
                          onChange={e =>
                            updateGlobal('site_title', e.target.value)
                          }
                          placeholder="MaltaGuns - Firearms Community Hub"
                          maxLength={TITLE_MAX}
                        />
                        <CharCount
                          length={globalForm.site_title.length}
                          recommended={TITLE_RECOMMENDED}
                          max={TITLE_MAX}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="site_description">
                          Site Description
                        </Label>
                        <Textarea
                          id="site_description"
                          value={globalForm.site_description}
                          onChange={e =>
                            updateGlobal('site_description', e.target.value)
                          }
                          placeholder="The premier destination for the firearms community in Malta"
                          rows={3}
                          maxLength={DESCRIPTION_MAX}
                        />
                        <CharCount
                          length={globalForm.site_description.length}
                          recommended={DESCRIPTION_RECOMMENDED}
                          max={DESCRIPTION_MAX}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="default_og_image">
                          Default OG Image URL
                        </Label>
                        <Input
                          id="default_og_image"
                          value={globalForm.default_og_image}
                          onChange={e =>
                            updateGlobal('default_og_image', e.target.value)
                          }
                          placeholder="https://..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twitter_handle">
                          Twitter / X Handle
                        </Label>
                        <Input
                          id="twitter_handle"
                          value={globalForm.twitter_handle}
                          onChange={e =>
                            updateGlobal('twitter_handle', e.target.value)
                          }
                          placeholder="maltaguns"
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        robots.txt and sitemap.xml are generated automatically.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {SECTION_GROUPS.map(group => {
                  const pages = getSectionsByGroup(group)
                  const selected = pages.includes(activePage)
                    ? activePage
                    : pages[0]

                  return (
                    <TabsContent
                      key={group}
                      value={group}
                      className="mt-4 space-y-4"
                    >
                      {pages.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                          {pages.map(key => (
                            <Button
                              key={key}
                              type="button"
                              size="sm"
                              variant={selected === key ? 'default' : 'outline'}
                              onClick={() => setActivePage(key)}
                            >
                              {SECTION_SEO_DEFAULTS[key].path === '/'
                                ? 'Home'
                                : SECTION_SEO_DEFAULTS[key].path
                                    .split('/')
                                    .filter(Boolean)
                                    .slice(-1)[0]
                                    .replace(/-/g, ' ')}
                            </Button>
                          ))}
                        </div>
                      )}

                      {(() => {
                        const key = selected
                        const defaults = SECTION_SEO_DEFAULTS[key]
                        const override = pageSeo[key] || {}
                        const titleValue = override.title || ''
                        const descriptionValue = override.description || ''

                        const label =
                          key === 'home'
                            ? 'Home'
                            : defaults.title.split('|')[0].trim()

                        return (
                          <Card>
                            <CardHeader>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <CardTitle>{label}</CardTitle>
                                  <CardDescription className="mt-1">
                                    Leave blank to use the on-page default.
                                  </CardDescription>
                                </div>
                                <Link
                                  href={defaults.path}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  {defaults.path}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-5">
                              <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                  On-page default
                                </p>
                                <p className="text-sm font-medium">
                                  {defaults.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {defaults.description}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Label htmlFor={`${key}-title`}>
                                    Meta Title
                                  </Label>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => applyDefault(key, 'title')}
                                    >
                                      Use default
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        clearPageField(key, 'title')
                                      }
                                      disabled={!titleValue}
                                    >
                                      Clear
                                    </Button>
                                  </div>
                                </div>
                                <Input
                                  id={`${key}-title`}
                                  value={titleValue}
                                  onChange={e =>
                                    updatePageField(
                                      key,
                                      'title',
                                      e.target.value
                                    )
                                  }
                                  placeholder={defaults.title}
                                  maxLength={TITLE_MAX}
                                />
                                <CharCount
                                  length={titleValue.length}
                                  recommended={TITLE_RECOMMENDED}
                                  max={TITLE_MAX}
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Label htmlFor={`${key}-description`}>
                                    Meta Description
                                  </Label>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        applyDefault(key, 'description')
                                      }
                                    >
                                      Use default
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        clearPageField(key, 'description')
                                      }
                                      disabled={!descriptionValue}
                                    >
                                      Clear
                                    </Button>
                                  </div>
                                </div>
                                <Textarea
                                  id={`${key}-description`}
                                  value={descriptionValue}
                                  onChange={e =>
                                    updatePageField(
                                      key,
                                      'description',
                                      e.target.value
                                    )
                                  }
                                  placeholder={defaults.description}
                                  rows={4}
                                  maxLength={DESCRIPTION_MAX}
                                />
                                <CharCount
                                  length={descriptionValue.length}
                                  recommended={DESCRIPTION_RECOMMENDED}
                                  max={DESCRIPTION_MAX}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })()}
                    </TabsContent>
                  )
                })}
              </Tabs>
            </div>

            <aside className="lg:sticky lg:top-24">
              <SerpPreview
                title={previewTitle}
                description={previewDescription}
                path={previewPath}
              />
            </aside>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 mt-6 px-4 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {isDirty ? 'You have unsaved changes' : 'All changes saved'}
              </p>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Saving...' : 'Save SEO Settings'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </PageLayout>
  )
}
