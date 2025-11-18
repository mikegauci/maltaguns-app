import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { EstablishmentWithDetails, EstablishmentType } from './types'
import { getEstablishmentConfig } from './config'

/**
 * Fetch establishment details with listings and blog posts
 * @param type - The type of establishment
 * @param slug - The establishment slug
 * @returns Establishment with details or null if not found
 */
export async function fetchEstablishmentBySlug(
  type: EstablishmentType,
  slug: string
): Promise<EstablishmentWithDetails | null> {
  const config = getEstablishmentConfig(type)

  // Fetch establishment details
  const { data: establishment, error: establishmentError } = await supabase
    .from(config.tableName)
    .select('*')
    .eq('slug', slug)
    .single()

  if (establishmentError || !establishment) {
    console.error(
      `Error fetching ${config.label}:`,
      establishmentError?.message
    )
    return null
  }

  console.log(
    `Found ${config.label}: ${establishment.business_name} (ID: ${establishment.id})`
  )

  // Fetch establishment's listings - only show active and non-expired listings
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', establishment.owner_id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (listingsError) {
    console.error('Error fetching listings:', listingsError)
  }

  // Fetch blog posts with the specific foreign key
  console.log(
    `Fetching blog posts for ${config.label} ID: ${establishment.id} using ${config.blogForeignKey}`
  )

  let { data: blogPosts, error: blogPostsError } = await supabase
    .from('blog_posts')
    .select(
      `
      id,
      title,
      slug,
      content,
      featured_image,
      created_at,
      category,
      ${config.blogForeignKey},
      author_id,
      author:profiles(username)
    `
    )
    .eq(config.blogForeignKey, establishment.id)
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (blogPostsError) {
    console.error(
      `${config.label} blog posts fetch error for ${establishment.business_name}: ${blogPostsError.message}`
    )
  } else {
    console.log(
      `Found ${blogPosts?.length || 0} blog posts for ${establishment.business_name}`
    )
  }

  // If there's an error or no posts found, try with admin client as fallback
  if (blogPostsError || !blogPosts || blogPosts.length === 0) {
    try {
      console.log(
        `Trying admin client for ${config.label} ID: ${establishment.id}`
      )

      const { data: adminBlogPosts, error: adminError } = await supabaseAdmin
        .from('blog_posts')
        .select(
          `
          id,
          title,
          slug,
          content,
          featured_image,
          created_at,
          category,
          ${config.blogForeignKey},
          author_id,
          author:profiles(username)
        `
        )
        .eq(config.blogForeignKey, establishment.id)
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (!adminError && adminBlogPosts && adminBlogPosts.length > 0) {
        console.log(
          `Found ${adminBlogPosts.length} blog posts with admin client`
        )
        blogPosts = adminBlogPosts
        blogPostsError = null
      } else if (adminError) {
        console.error(`Admin client error: ${adminError.message}`)
      } else {
        console.log('No blog posts found with admin client')
      }
    } catch (error) {
      console.error('Error using admin client:', error)
    }
  }

  // Process blog posts to ensure they have the correct structure
  const processedBlogPosts = (blogPosts || []).map(post => ({
    ...post,
    author: post.author || { username: 'Author' },
    category: post.category || 'news',
  }))

  return {
    ...establishment,
    listings: listings || [],
    blogPosts: processedBlogPosts,
  }
}
