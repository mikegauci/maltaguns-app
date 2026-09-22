import { createClient } from '@/lib/supabase/server'
import { truncateDescription } from '@/lib/seo'

export type HelpTab = {
  id: string
  slug: string
  title: string
  section_title: string
  section_description: string
  banner_text: string | null
  sort_order: number
  published: boolean
}

export type HelpFaqItem = {
  id: string
  tab_id: string
  question: string
  answer: string
  sort_order: number
  published: boolean
}

export type HelpGuide = {
  id: string
  title: string
  slug: string
  description: string
  sort_order: number
}

export type HelpTabContent = HelpTab & {
  faqs: HelpFaqItem[]
  guides: HelpGuide[]
}

export async function fetchPublishedHelpCenter(): Promise<HelpTabContent[]> {
  const supabase = await createClient()

  const { data: tabs, error: tabsError } = await supabase
    .from('help_tabs')
    .select('*')
    .eq('published', true)
    .order('sort_order', { ascending: true })

  if (tabsError || !tabs?.length) {
    return []
  }

  const tabIds = tabs.map(tab => tab.id)

  const [{ data: faqs }, { data: tabGuides }] = await Promise.all([
    supabase
      .from('help_faq_items')
      .select('*')
      .in('tab_id', tabIds)
      .eq('published', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('help_tab_guides')
      .select(
        `
        tab_id,
        sort_order,
        blog_post:blog_posts (
          id,
          title,
          slug,
          content,
          meta_description,
          published,
          category
        )
      `
      )
      .in('tab_id', tabIds)
      .order('sort_order', { ascending: true }),
  ])

  const faqsByTab = new Map<string, HelpFaqItem[]>()
  for (const faq of faqs ?? []) {
    const list = faqsByTab.get(faq.tab_id) ?? []
    list.push(faq)
    faqsByTab.set(faq.tab_id, list)
  }

  type GuidePostRow = {
    id: string
    title: string
    slug: string
    content: string
    meta_description: string | null
    published: boolean
    category: string
  }

  const guidesByTab = new Map<string, HelpGuide[]>()
  for (const assignment of tabGuides ?? []) {
    const rawPost = assignment.blog_post as GuidePostRow | GuidePostRow[] | null
    const post = Array.isArray(rawPost) ? rawPost[0] : rawPost

    if (!post?.published || post.category !== 'guides') continue

    const list = guidesByTab.get(assignment.tab_id) ?? []
    list.push({
      id: post.id,
      title: post.title,
      slug: post.slug,
      description:
        post.meta_description?.trim() ||
        truncateDescription(post.content, 120) ||
        '',
      sort_order: assignment.sort_order,
    })
    guidesByTab.set(assignment.tab_id, list)
  }

  return tabs.map(tab => ({
    ...tab,
    faqs: faqsByTab.get(tab.id) ?? [],
    guides: (guidesByTab.get(tab.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }))
}
