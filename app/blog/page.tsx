'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import BlogPostCard from '../../components/blog/BlogPostCard'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'
import { useSupabase } from '@/components/providers/SupabaseProvider'

async function fetchBlogPosts() {
  const res = await fetch('/api/public/blog')
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json() as Promise<{ posts: any[] }>
}

export default function BlogPage() {
  const { supabase, session } = useSupabase()
  const userId = session?.user?.id

  const postsQuery = useQuery({
    queryKey: ['public-blog'],
    queryFn: fetchBlogPosts,
  })

  const canCreateQuery = useQuery({
    queryKey: ['blog-can-create', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false

      const [profileRes, storeRes, clubRes, rangeRes, servicingRes] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .single(),
          supabase
            .from('stores')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle(),
          supabase
            .from('clubs')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle(),
          supabase
            .from('ranges')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle(),
          supabase
            .from('servicing')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle(),
        ])

      const isAdmin = !!profileRes.data?.is_admin
      const hasEstablishment =
        !!storeRes.data ||
        !!clubRes.data ||
        !!rangeRes.data ||
        !!servicingRes.data

      return isAdmin || hasEstablishment
    },
  })

  const canCreate = !!canCreateQuery.data
  const posts = postsQuery.data?.posts ?? []

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
      {postsQuery.isLoading ? (
        <p className="text-muted-foreground text-lg">Loading blog posts…</p>
      ) : postsQuery.error ? (
        <p className="text-destructive text-lg">Failed to load blog posts.</p>
      ) : posts.length === 0 ? (
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
