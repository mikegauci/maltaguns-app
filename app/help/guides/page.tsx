import Link from 'next/link'
import { Button } from '@/components/ui/button'
import BlogPostCard from '@/components/blog/BlogPostCard'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'
import { fetchHelpGuidesListing } from '@/lib/help-guides'
import { getSectionMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export const revalidate = 30

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('help_guides')
}

export default async function HelpGuidesPage() {
  const posts = await fetchHelpGuidesListing()

  return (
    <PageLayout>
      <PageHeader
        align="center"
        title="Help Guides"
        description="Step-by-step guides and resources for using MaltaGuns, licensing, safety, and account management."
      />
      <div className="flex gap-4 justify-center mb-8">
        <Link href="/help">
          <Button variant="outline">Help Center</Button>
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="text-muted-foreground text-lg text-center">
          No help guides found.
        </p>
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
