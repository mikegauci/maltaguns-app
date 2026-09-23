import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { EstablishmentWithDetails, EstablishmentType } from './types'
import { getEstablishmentConfig } from './config'
import {
  ESTABLISHMENT_CARD_SELECT,
  LISTING_CARD_SELECT,
} from '@/lib/query-selects'

function buildEstablishmentBlogSelect(blogForeignKey: string) {
  return `
    id,
    title,
    slug,
    featured_image,
    meta_description,
    created_at,
    category,
    author_id,
    ${blogForeignKey},
    author:profiles(username)
  `
}

export const fetchEstablishmentBySlug = cache(
  async (
    type: EstablishmentType,
    slug: string
  ): Promise<EstablishmentWithDetails | null> => {
    const config = getEstablishmentConfig(type)
    const supabase = await createClient()

    const { data: establishment, error: establishmentError } = await supabase
      .from(config.tableName)
      .select(ESTABLISHMENT_CARD_SELECT)
      .eq('slug', slug)
      .single()

    if (establishmentError || !establishment) {
      console.error(
        `Error fetching ${config.label}:`,
        establishmentError?.message
      )
      return null
    }

    const now = new Date().toISOString()

    const [listingsRes, blogPostsRes] = await Promise.all([
      supabase
        .from('listings')
        .select(LISTING_CARD_SELECT)
        .eq('seller_id', establishment.owner_id)
        .eq('status', 'active')
        .gt('expires_at', now)
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('blog_posts')
        .select(buildEstablishmentBlogSelect(config.blogForeignKey))
        .eq(config.blogForeignKey, establishment.id)
        .eq('published', true)
        .order('created_at', { ascending: false }),
    ])

    if (listingsRes.error) {
      console.error('Error fetching listings:', listingsRes.error)
    }

    let blogPosts = blogPostsRes.data as any[] | null
    let blogPostsError = blogPostsRes.error

    if (blogPostsError) {
      console.error(
        `${config.label} blog posts fetch error for ${establishment.business_name}: ${blogPostsError.message}`
      )
    }

    if (blogPostsError || !blogPosts || blogPosts.length === 0) {
      try {
        const { data: adminBlogPosts, error: adminError } = await (
          supabaseAdmin as any
        )
          .from('blog_posts')
          .select(buildEstablishmentBlogSelect(config.blogForeignKey))
          .eq(config.blogForeignKey, establishment.id)
          .eq('published', true)
          .order('created_at', { ascending: false })

        if (!adminError && adminBlogPosts && adminBlogPosts.length > 0) {
          blogPosts = adminBlogPosts
          blogPostsError = null
        } else if (adminError) {
          console.error(`Admin client error: ${adminError.message}`)
        }
      } catch (error) {
        console.error('Error using admin client:', error)
      }
    }

    const processedBlogPosts = (blogPosts || []).map(post => ({
      ...post,
      author: post.author || { username: 'Author' },
      category: post.category || 'news',
    }))

    return {
      ...establishment,
      listings: listingsRes.data || [],
      blogPosts: processedBlogPosts,
    }
  }
)
