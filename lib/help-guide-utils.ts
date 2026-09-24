import type { SupabaseClient } from '@supabase/supabase-js'

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

export function getHelpGuidePublicPath(slug: string) {
  return `/help/guides/${slug}`
}
