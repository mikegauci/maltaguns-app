import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import BlogPostCard from '../../components/blog/BlogPostCard'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

// Note: Admin check now uses database is_admin field instead of hardcoded IDs

export default async function BlogPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  // Fetch posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(
      `
      *,
      author:profiles(username),
      store:stores(id, business_name, slug),
      club:clubs(id, business_name, slug),
      range:ranges(id, business_name, slug),
      servicing:servicing(id, business_name, slug)
    `
    )
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts:', error)
    throw new Error('Failed to fetch posts')
  }

  // Add debug logging for establishment data
  console.log(
    'Found posts with establishment data:',
    posts.map(post => ({
      id: post.id,
      title: post.title,
      hasStore: post.store && post.store.length > 0,
      hasClub: post.club && post.club.length > 0,
      hasRange: post.range && post.range.length > 0,
      hasServicing: post.servicing && post.servicing.length > 0,
      store_id: post.store_id,
      club_id: post.club_id,
      range_id: post.range_id,
      servicing_id: post.servicing_id,
    }))
  )

  // Check if current user is authorized to create posts
  let canCreate = false
  let userId = null
  let userEstablishment = null
  let debugInfo = {
    userId: '',
    isAdmin: false,
    hasStore: false,
    hasClub: false,
    hasRange: false,
    hasServicing: false,
  }

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user) {
    userId = session.user.id
    debugInfo.userId = userId

    console.log('User logged in:', userId)

    // Check if user is an admin using database field
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (!profileError && profile && profile.is_admin) {
      canCreate = true
      debugInfo.isAdmin = true
      console.log('User is admin (from database)')
    }

    // Check if user has a store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (storeError) console.error('Store query error:', storeError)
    if (store) {
      console.log('User has store with ID:', store.id)
      canCreate = true
      userEstablishment = { ...store, type: 'store' }
      debugInfo.hasStore = true
    }

    // Check if user has other establishments (clubs, ranges, servicing)
    const { data: club } = await supabase
      .from('clubs')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (club) {
      console.log('User has club with ID:', club.id)
      canCreate = true
      userEstablishment = { ...club, type: 'club' }
      debugInfo.hasClub = true
    }

    const { data: range } = await supabase
      .from('ranges')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (range) {
      console.log('User has range with ID:', range.id)
      canCreate = true
      userEstablishment = { ...range, type: 'range' }
      debugInfo.hasRange = true
    }

    const { data: servicing } = await supabase
      .from('servicing')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (servicing) {
      console.log('User has servicing with ID:', servicing.id)
      canCreate = true
      userEstablishment = { ...servicing, type: 'servicing' }
      debugInfo.hasServicing = true
    }
  }

  console.log('Authorization summary:', { canCreate, debugInfo })

  // If the user has an establishment, log its details
  if (userEstablishment) {
    console.log('User establishment:', userEstablishment)
  }

  return (
    <PageLayout>
      <PageHeader
        title="Blog"
        description="Read the latest news, guides, and insights from Malta's firearms community. Stay informed about industry updates, safety practices, and expert advice from local dealers and enthusiasts."
      />
      <div className="flex gap-4 justify-center mb-8">
          {canCreate && (
            <Link href="/blog/create">
              <Button className="bg-primary">
                <Plus className="h-4 w-4 mr-2" />
                Write Post
              </Button>
            </Link>
          )}
          <Link href="/blog/news">
            <Button variant="outline">News</Button>
          </Link>
          <Link href="/blog/guides">
            <Button variant="outline">Guides</Button>
          </Link>
        </div>
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-lg">No blog posts found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
    </PageLayout>
  )
}
