import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import BlogPostCard from '../components/blog/BlogPostCard'

export default async function BlogPage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts:', error)
    throw new Error('Failed to fetch posts')
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Blog</h1>
          <div className="flex gap-4">
            <Link href="/blog/news">
              <Button variant="outline">News</Button>
            </Link>
            <Link href="/blog/guides">
              <Button variant="outline">Guides</Button>
            </Link>
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="text-muted-foreground text-lg">No blog posts found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
