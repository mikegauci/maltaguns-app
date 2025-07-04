import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Database } from '@/lib/database.types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Pencil, Store, Users, MapPin, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ViewTracker from '@/app/components/blog/ViewTracker'

interface BlogPost {
  id: string
  title: string
  content: string
  slug: string
  featured_image: string | null
  author_id: string
  store_id?: string
  club_id?: string
  range_id?: string
  servicing_id?: string
  published: boolean
  created_at: string
  author: {
    username: string
  }
  retailer?: {
    id: string
    business_name: string
    slug: string
    logo_url: string | null
  }
  store?: { id: string; business_name: string; slug: string }[]
  club?: { id: string; business_name: string; slug: string }[]
  range?: { id: string; business_name: string; slug: string }[]
  servicing?: { id: string; business_name: string; slug: string }[]
}

type SupabaseResponse = {
  id: string
  title: string
  content: string
  slug: string
  featured_image: string | null
  published: boolean
  created_at: string
  author_id: string
  store_id?: string
  club_id?: string
  range_id?: string
  servicing_id?: string
  author: {
    username: string
  } | null
  retailer:
    | {
        id: string
        business_name: string
        slug: string
        logo_url: string | null
      }[]
    | null
  store: { id: string; business_name: string; slug: string }[] | null
  club: { id: string; business_name: string; slug: string }[] | null
  range: { id: string; business_name: string; slug: string }[] | null
  servicing: { id: string; business_name: string; slug: string }[] | null
}

// Force dynamic rendering (disable static export)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function BlogPost({
  params,
}: {
  params: { category: string; slug: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  })

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(
      `
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
      author:profiles(username),
      retailer:stores(id, business_name, slug, logo_url),
      store:stores(id, business_name, slug),
      club:clubs(id, business_name, slug),
      range:ranges(id, business_name, slug),
      servicing:servicing(id, business_name, slug)
    `
    )
    .eq('slug', params.slug)
    .eq('category', params.category)
    .eq('published', true)
    .single()

  if (error || !post) {
    notFound()
  }

  // Log the structure to help debug
  console.log('Blog post data structure:', JSON.stringify(post, null, 2))

  // Handle differences in the API response structure by fetching the username directly
  let authorUsername = 'Unknown'
  try {
    if (post.author && typeof post.author === 'object') {
      // If the author field is available directly
      if (
        'username' in post.author &&
        typeof post.author.username === 'string'
      ) {
        authorUsername = post.author.username
      }
      // If it's an array structure
      else if (
        Array.isArray(post.author) &&
        post.author.length > 0 &&
        typeof post.author[0]?.username === 'string'
      ) {
        authorUsername = post.author[0].username
      }
    }
  } catch (err) {
    console.error('Error extracting author username:', err)
  }

  // Determine if post is from an establishment and which type
  const getEstablishment = () => {
    // First check if store_id exists directly on post
    if (post.store_id) {
      // Look for matching store data
      if (post.store && post.store.length > 0) {
        return {
          type: 'store',
          name: post.store[0].business_name,
          slug: post.store[0].slug,
        }
      }
      // For store posts without store data, we'll use a cleaner URL
      return {
        type: 'store',
        name: 'Gun Store',
        slug: `$slug$${post.store_id}`,
      }
    }

    // Continue with other establishment types
    if (post.club_id && post.club && post.club.length > 0) {
      return {
        type: 'club',
        name: post.club[0].business_name,
        slug: post.club[0].slug,
      }
    } else if (post.club_id) {
      return { type: 'club', name: 'Club', slug: `$slug$${post.club_id}` }
    }

    if (post.range_id && post.range && post.range.length > 0) {
      return {
        type: 'range',
        name: post.range[0].business_name,
        slug: post.range[0].slug,
      }
    } else if (post.range_id) {
      return { type: 'range', name: 'Range', slug: `$slug$${post.range_id}` }
    }

    if (post.servicing_id && post.servicing && post.servicing.length > 0) {
      return {
        type: 'servicing',
        name: post.servicing[0].business_name,
        slug: post.servicing[0].slug,
      }
    } else if (post.servicing_id) {
      return {
        type: 'servicing',
        name: 'Servicing',
        slug: `$slug$${post.servicing_id}`,
      }
    }

    // Fallback to just checking the related objects
    if (post.store && post.store.length > 0) {
      return {
        type: 'store',
        name: post.store[0].business_name,
        slug: post.store[0].slug,
      }
    }
    if (post.club && post.club.length > 0) {
      return {
        type: 'club',
        name: post.club[0].business_name,
        slug: post.club[0].slug,
      }
    }
    if (post.range && post.range.length > 0) {
      return {
        type: 'range',
        name: post.range[0].business_name,
        slug: post.range[0].slug,
      }
    }
    if (post.servicing && post.servicing.length > 0) {
      return {
        type: 'servicing',
        name: post.servicing[0].business_name,
        slug: post.servicing[0].slug,
      }
    }

    return null
  }

  const establishment = getEstablishment()

  // Utility to handle special slug format
  const getEstablishmentLink = (establishment: {
    type: string
    name: string
    slug: string
  }) => {
    if (establishment.slug.startsWith('$slug$')) {
      // This is an ID, get it from the slug format
      const id = establishment.slug.replace('$slug$', '')
      // For Motor Element Test 3 - special case
      if (id === '8f2fb68a-62a3-4a8f-9465-7181e442867f') {
        return `/establishments/${establishment.type}s/motor-element-test-3`
      }
      return `/establishments/${establishment.type}s/${id}`
    }
    return `/establishments/${establishment.type}s/${establishment.slug}`
  }

  // Convert the post to the expected interface
  const blogPost: BlogPost = {
    id: post.id,
    title: post.title,
    content: post.content,
    slug: post.slug,
    featured_image: post.featured_image,
    published: post.published,
    created_at: post.created_at,
    author_id: post.author_id,
    store_id: post.store_id,
    club_id: post.club_id,
    range_id: post.range_id,
    servicing_id: post.servicing_id,
    author: {
      username: authorUsername,
    },
    retailer: post.retailer?.[0] || undefined,
    store: post.store || [],
    club: post.club || [],
    range: post.range || [],
    servicing: post.servicing || [],
  }

  // Get current session to check if user can edit
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const canEdit = session?.user.id === post.author_id

  // Get the establishment icon based on type
  const getEstablishmentIcon = () => {
    if (!establishment) return null

    switch (establishment.type) {
      case 'store':
        return <Store className="h-4 w-4 mr-1" />
      case 'club':
        return <Users className="h-4 w-4 mr-1" />
      case 'range':
        return <MapPin className="h-4 w-4 mr-1" />
      case 'servicing':
        return <Wrench className="h-4 w-4 mr-1" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <ViewTracker postId={post.id} />
      <div className="container max-w-screen-lg mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to blog
          </Link>
          {canEdit && (
            <Link href={`/blog/${params.category}/${params.slug}/edit`}>
              <Button>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Post
              </Button>
            </Link>
          )}
        </div>

        <article className="prose prose-neutral dark:prose-invert prose-strong:text-[#0a0a0a] prose-b:text-[#0a0a0a] mx-auto">
          {post.featured_image && (
            <div className="mb-8">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-[550px] object-cover rounded-lg"
              />
            </div>
          )}

          <div className="mb-8">
            <h1 className="mb-4">{blogPost.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>By {blogPost.author.username}</span>
              <span>•</span>
              <span>
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span>•</span>
              <Link
                href={`/blog/${params.category}`}
                className="text-primary hover:text-primary/80"
              >
                {params.category.charAt(0).toUpperCase() +
                  params.category.slice(1)}
              </Link>

              {establishment && (
                <>
                  <span>•</span>
                  <Link
                    href={getEstablishmentLink(establishment)}
                    className="inline-flex items-center"
                    prefetch={false}
                  >
                    <Badge variant="outline" className="flex items-center">
                      {getEstablishmentIcon()}
                      {establishment.name}
                    </Badge>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>
      </div>
    </div>
  )
}
