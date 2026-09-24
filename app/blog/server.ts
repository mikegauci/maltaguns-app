import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

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

export const fetchBlogPostBySlug = cache(
  async (category: string, slug: string) => {
    const supabase = await createClient()
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(BLOG_POST_SELECT)
      .eq('slug', slug)
      .eq('category', category)
      .eq('published', true)
      .single()

    if (error || !post) return null
    return post
  }
)

export const fetchBlogPostMetadata = cache(
  async (category: string, slug: string) => {
    const supabase = await createClient()
    const { data: post } = await supabase
      .from('blog_posts')
      .select('title, content, featured_image, meta_title, meta_description')
      .eq('slug', slug)
      .eq('category', category)
      .eq('published', true)
      .single()

    return post
  }
)
