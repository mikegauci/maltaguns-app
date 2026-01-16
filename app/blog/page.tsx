import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import BlogPostCard from '../../components/blog/BlogPostCard'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

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

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user) {
    userId = session.user.id
    debugInfo.userId = userId

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (!profileError && profile && profile.is_admin) {
      canCreate = true
      debugInfo.isAdmin = true
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (storeError) console.error('Store query error:', storeError)
    if (store) {
      canCreate = true
      userEstablishment = { ...store, type: 'store' }
      debugInfo.hasStore = true
    }

    const { data: club } = await supabase
      .from('clubs')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    if (club) {
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
      canCreate = true
      userEstablishment = { ...servicing, type: 'servicing' }
      debugInfo.hasServicing = true
    }
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
