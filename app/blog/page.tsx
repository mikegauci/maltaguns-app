import Link from 'next/link'
import { Button } from '@/components/ui/button'
import BlogPostCard from '@/components/blog/BlogPostCard'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'
import { getBlogPageData } from '@/lib/public-data'
import { BlogCreateButton } from '@/components/blog/BlogCreateButton'

export const revalidate = 30

export default async function BlogPage() {
  const { posts } = await getBlogPageData()

  return (
    <PageLayout>
      <PageHeader
        title="Blog"
        description="Read the latest news, guides, and insights from Malta's firearms community. Stay informed about industry updates, safety practices, and expert advice from local dealers and enthusiasts."
      />
      <div className="flex gap-4 justify-center mb-8">
        <BlogCreateButton />
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
          {posts.map((post: any) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </PageLayout>
  )
}
