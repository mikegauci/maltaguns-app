import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import BlogPostCard from '@/app/components/blog/BlogPostCard'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

const validCategories = ['news', 'guides']

export default async function CategoryArchive({
  params,
}: {
  params: { category: string }
}) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const category = params.category.toLowerCase()

  if (!validCategories.includes(category)) {
    return notFound()
  }

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(
      `
      *,
      author:profiles!blog_posts_author_id_fkey (*),
      stores:store_id (*),
      clubs:club_id (*),
      ranges:range_id (*),
      servicing:servicing_id (*)
    `
    )
    .eq('category', category)
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
          <h1 className="text-4xl font-bold capitalize">{category} Articles</h1>
          <div className="flex gap-4">
            <Link href="/blog">
              <Button variant="outline">All Posts</Button>
            </Link>
            {validCategories.map(cat => (
              <Link key={cat} href={`/blog/${cat}`}>
                <Button variant={cat === category ? 'default' : 'outline'}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {!posts || posts.length === 0 ? (
          <p className="text-muted-foreground text-lg">
            No {category} articles found.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
