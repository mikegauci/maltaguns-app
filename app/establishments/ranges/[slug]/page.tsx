import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import RangeClient from './range-client'
interface Range {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  description: string | null
  website: string | null
  owner_id: string
  slug: string
}

interface RangeDetails extends Range {
  listings: {
    id: string
    title: string
    type: 'firearms' | 'non_firearms'
    category: string
    price: number
    thumbnail: string
    created_at: string
  }[]
  blogPosts: {
    id: string
    title: string
    slug: string
    content: string
    featured_image: string | null
    created_at: string
    author: {
      username: string
    }
  }[]
}

// Force dynamic rendering (disable static export)
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0 // Disable cache

export default async function RangePage({
  params,
}: {
  params: { slug: string }
}) {
  // Force cache revalidation
  headers()

  // Fetch range details
  const { data: range, error: rangeError } = await supabase
    .from('ranges')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (rangeError || !range) {
    notFound()
  }

  // Fetch range's listings
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', range.owner_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (listingsError) {
    console.error('Error fetching listings:', listingsError)
  }

  // Fetch blog posts from blog_posts table with owner matching this range owner
  console.log(`Fetching blog posts for range owner ID: ${range.owner_id}`)
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
      range_id,
      store_id,
      servicing_id,
      club_id,
      author_id,
      author:profiles(username)
    `
    )
    .eq('author_id', range.owner_id)
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (blogPostsError) {
    console.error(
      `Range blog posts fetch error for ${range.business_name}: ${blogPostsError.message}`
    )
    console.error(blogPostsError)

    // Try alternative approach - check for posts with this range_id
    console.log('Trying establishment ID approach...')
    const { data: altBlogPosts, error: altError } = await supabase
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
        range_id,
        store_id,
        servicing_id,
        club_id,
        author_id,
        author:profiles(username)
      `
      )
      .eq('range_id', range.id)
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (!altError && altBlogPosts && altBlogPosts.length > 0) {
      console.log(
        `Found ${altBlogPosts.length} blog posts with establishment ID approach`
      )
      blogPosts = altBlogPosts
      blogPostsError = null
    } else if (altError) {
      console.error('Error with alternative query:', altError)
    } else {
      console.log('No blog posts found with establishment ID approach')
    }
  } else {
    console.log(
      `Found ${blogPosts?.length || 0} blog posts for ${range.business_name}`
    )
  }

  // If there's an error or no posts found, try with admin client as fallback
  if (blogPostsError || !blogPosts || blogPosts.length === 0) {
    try {
      console.log(`Trying admin client for range owner ID: ${range.owner_id}`)
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
          range_id,
          store_id, 
          servicing_id,
          club_id,
          author_id,
          author:profiles(username)
        `
        )
        .eq('author_id', range.owner_id)
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
  const processedBlogPosts = (blogPosts || []).map(post => {
    // Ensure the author property exists and has the correct structure
    return {
      ...post,
      author: post.author || { username: 'Author' },
    }
  })

  const rangeDetails: RangeDetails = {
    ...range,
    listings: listings || [],
    blogPosts: processedBlogPosts,
  }

  return <RangeClient range={rangeDetails} />
}
