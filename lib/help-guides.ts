import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase/public'
import { BLOG_CARD_SELECT } from '@/lib/query-selects'

const BLOG_POST_SELECT = `
  id,
  title,
  content,
  slug,
  featured_image,
  published,
  created_at,
  author_id,
  store_id,
  club_id,
  range_id,
  servicing_id,
  meta_title,
  meta_description,
  category,
  author:profiles(username),
  store:stores(id, business_name, slug),
  club:clubs(id, business_name, slug),
  range:ranges(id, business_name, slug),
  servicing:servicing(id, business_name, slug)
`

export async function loadPublishedHelpGuidePostIds(
  supabaseClient: SupabaseClient
): Promise<Set<string>> {
  const { data: tabs, error: tabsError } = await supabaseClient
    .from('help_tabs')
    .select('id')
    .eq('published', true)

  if (tabsError) {
    throw new Error(tabsError.message)
  }

  if (!tabs?.length) {
    return new Set()
  }

  const tabIds = tabs.map(tab => tab.id)
  const { data: assignments, error: assignmentsError } = await supabaseClient
    .from('help_tab_guides')
    .select('blog_post_id')
    .in('tab_id', tabIds)

  if (assignmentsError) {
    throw new Error(assignmentsError.message)
  }

  return new Set((assignments ?? []).map(row => row.blog_post_id))
}

export function formatExcludeHelpGuideIdsFilter(helpGuideIds: Set<string>) {
  if (helpGuideIds.size === 0) return null
  return `(${[...helpGuideIds].map(id => `"${id}"`).join(',')})`
}

export function applyExcludeHelpGuideIds<T extends { not: Function }>(
  query: T,
  helpGuideIds: Set<string>
): T {
  const filter = formatExcludeHelpGuideIdsFilter(helpGuideIds)
  if (!filter) return query
  return query.not('id', 'in', filter)
}

export const fetchHelpGuidePostIds = cache(async (): Promise<Set<string>> => {
  const supabaseClient = await createClient()
  return loadPublishedHelpGuidePostIds(supabaseClient)
})

export const fetchHelpGuidePostIdsPublic = cache(
  async (): Promise<Set<string>> => {
    return loadPublishedHelpGuidePostIds(supabase)
  }
)

export function isHelpGuidePostId(id: string, ids: Set<string>) {
  return ids.has(id)
}

export function excludeHelpGuidePosts<T extends { id: string }>(
  posts: T[],
  helpGuideIds: Set<string>
) {
  if (helpGuideIds.size === 0) return posts
  return posts.filter(post => !helpGuideIds.has(post.id))
}

export function enrichPostsWithHelpGuideFlag<T extends { id: string }>(
  posts: T[],
  helpGuideIds: Set<string>
) {
  return posts.map(post => ({
    ...post,
    is_help_guide: helpGuideIds.has(post.id),
  }))
}

export const fetchHelpGuidesListing = cache(async () => {
  const supabaseClient = await createClient()
  const helpGuideIds = await loadPublishedHelpGuidePostIds(supabaseClient)

  if (helpGuideIds.size === 0) {
    return []
  }

  const postIds = [...helpGuideIds]

  const { data: posts, error: postsError } = await supabaseClient
    .from('blog_posts')
    .select(BLOG_CARD_SELECT)
    .in('id', postIds)
    .eq('category', 'guides')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (postsError) {
    throw new Error(postsError.message)
  }

  return (posts ?? []).map(post => ({
    ...post,
    is_help_guide: true,
    author: Array.isArray(post.author) ? post.author[0] : post.author,
  }))
})

export const fetchHelpGuideBySlug = cache(async (slug: string) => {
  const supabaseClient = await createClient()
  const { data: post, error: postError } = await supabaseClient
    .from('blog_posts')
    .select(BLOG_POST_SELECT)
    .eq('slug', slug)
    .eq('category', 'guides')
    .eq('published', true)
    .single()

  if (postError || !post) return null

  const helpGuideIds = await loadPublishedHelpGuidePostIds(supabaseClient)
  if (!helpGuideIds.has(post.id)) return null

  return post
})

export async function isPostAssignedToHelpTab(postId: string) {
  const helpGuideIds = await fetchHelpGuidePostIds()
  return helpGuideIds.has(postId)
}

export function getHelpGuidePublicPath(slug: string) {
  return `/help/guides/${slug}`
}
