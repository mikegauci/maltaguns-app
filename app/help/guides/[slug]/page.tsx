import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  BlogPostView,
  resolveAuthorUsername,
  resolveEstablishment,
} from '@/components/blog/BlogPostView'
import { buildMetadata, getSiteSettings, truncateDescription } from '@/lib/seo'
import { fetchHelpGuideBySlug } from '@/lib/help-guides'

export const revalidate = 30

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const params = await props.params
  const post = await fetchHelpGuideBySlug(params.slug)

  if (!post) {
    return buildMetadata({
      title: 'Guide Not Found | MaltaGuns',
      noIndex: true,
    })
  }

  const siteSettings = await getSiteSettings()
  return buildMetadata({
    title: (post as any).meta_title || `${post.title} | MaltaGuns`,
    description:
      (post as any).meta_description ||
      truncateDescription(post.content) ||
      undefined,
    image: post.featured_image || undefined,
    path: `/help/guides/${params.slug}`,
    siteSettings,
  })
}

export default async function HelpGuidePage(props: {
  params: Promise<{ slug: string }>
}) {
  const params = await props.params
  const post = await fetchHelpGuideBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const publicPath = `/help/guides/${params.slug}`
  const authorUsername = resolveAuthorUsername(post.author)
  const establishment = resolveEstablishment(post)

  return (
    <BlogPostView
      post={{
        id: post.id,
        title: post.title,
        content: post.content,
        slug: post.slug,
        featured_image: post.featured_image,
        created_at: post.created_at,
        author_id: post.author_id,
        meta_description: (post as any).meta_description,
      }}
      authorUsername={authorUsername}
      category="guides"
      publicPath={publicPath}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Help', path: '/help' },
        { name: 'Guides', path: '/help/guides' },
        { name: post.title, path: publicPath },
      ]}
      backHref="/help"
      categoryArchiveHref="/help/guides"
      categoryLabel="Guides"
      establishment={establishment}
    />
  )
}
