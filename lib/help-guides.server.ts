import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { BLOG_CARD_SELECT } from '@/lib/query-selects'
import { loadPublishedHelpGuidePostIds } from '@/lib/help-guide-utils'

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

export const fetchHelpGuidePostIds = cache(async (): Promise<Set<string>> => {
  const supabaseClient = await createClient()
  return loadPublishedHelpGuidePostIds(supabaseClient)
})

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
