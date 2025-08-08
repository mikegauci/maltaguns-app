import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { notFound } from 'next/navigation'
import ServicingClient from './servicing-client'
import { headers } from 'next/headers'

interface Servicing {
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

interface ServicingDetails extends Servicing {
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
    category: string
    author: {
      username: string
    }
  }[]
}

// Force dynamic rendering (disable static export)
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0 // Disable cache

export default async function ServicingPage({
  params,
}: {
  params: { slug: string }
}) {
  // Force cache revalidation
  headers()

  // Fetch servicing details
  const { data: servicing, error: servicingError } = await supabase
    .from('servicing')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (servicingError || !servicing) {
    notFound()
  }

  console.log(
    `Found servicing: ${servicing.business_name} (ID: ${servicing.id})`
  )

  // Fetch servicing's listings - only show active and non-expired listings
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', servicing.owner_id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (listingsError) {
    console.error('Error fetching listings:', listingsError)
  }

  // Fetch blog posts from blog_posts table with owner matching this servicing owner
  console.log(
    `Fetching blog posts for servicing owner ID: ${servicing.owner_id}`
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
      servicing_id,
      store_id,
      author_id,
      author:profiles(username)
    `
    )
    .eq('author_id', servicing.owner_id)
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (blogPostsError) {
    console.error(
      `Servicing blog posts fetch error for ${servicing.business_name}: ${blogPostsError.message}`
    )
    console.error(blogPostsError)

    // Try alternative approach - check for posts with this servicing_id or store_id
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
        servicing_id,
        store_id,
        author_id,
        author:profiles(username)
      `
      )
      .or(`servicing_id.eq.${servicing.id},store_id.eq.${servicing.id}`)
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
      `Found ${blogPosts?.length || 0} blog posts for ${servicing.business_name}`
    )
  }

  // If there's an error or no posts found, try with admin client as fallback
  if (blogPostsError || !blogPosts || blogPosts.length === 0) {
    try {
      console.log(
        `Trying admin client for servicing owner ID: ${servicing.owner_id}`
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
          servicing_id,
          store_id,
          author_id,
          author:profiles(username)
        `
        )
        .eq('author_id', servicing.owner_id)
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
      category: post.category || 'news', // Ensure category always has a value
    }
  })

  const servicingDetails: ServicingDetails = {
    ...servicing,
    listings: listings || [],
    blogPosts: processedBlogPosts,
  }

  return <ServicingClient servicing={servicingDetails} />
}
