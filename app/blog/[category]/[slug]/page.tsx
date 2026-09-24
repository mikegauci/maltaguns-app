import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import {
  BlogPostView,
  resolveAuthorUsername,
  resolveEstablishment,
} from '@/components/blog/BlogPostView'
import { buildMetadata, getSiteSettings, truncateDescription } from '@/lib/seo'
import { fetchBlogPostBySlug } from '@/app/blog/server'
import { getHelpGuidePublicPath } from '@/lib/help-guide-utils'
import { isPostAssignedToHelpTab } from '@/lib/help-guides.server'

export const revalidate = 30

export async function generateMetadata(props: {
  params: Promise<{ category: string; slug: string }>
}): Promise<Metadata> {
  const params = await props.params
  const post = await fetchBlogPostBySlug(params.category, params.slug)

  if (!post) {
    return buildMetadata({
      title: 'Post Not Found | MaltaGuns',
      noIndex: true,
    })
  }

  const isHelpGuide =
    params.category === 'guides' && (await isPostAssignedToHelpTab(post.id))
  const publicPath = isHelpGuide
    ? getHelpGuidePublicPath(params.slug)
    : `/blog/${params.category}/${params.slug}`

  const siteSettings = await getSiteSettings()
  return buildMetadata({
    title: (post as any).meta_title || `${post.title} | MaltaGuns`,
    description:
      (post as any).meta_description ||
      truncateDescription(post.content) ||
      undefined,
    image: post.featured_image || undefined,
    path: publicPath,
    siteSettings,
  })
}

export default async function BlogPost(props: {
  params: Promise<{ category: string; slug: string }>
}) {
  const params = await props.params
  const post = await fetchBlogPostBySlug(params.category, params.slug)

  if (!post) {
    notFound()
  }

  if (
    params.category === 'guides' &&
    (await isPostAssignedToHelpTab(post.id))
  ) {
    permanentRedirect(getHelpGuidePublicPath(params.slug))
  }

  const publicPath = `/blog/${params.category}/${params.slug}`
  const authorUsername = resolveAuthorUsername(post.author)
  const establishment = resolveEstablishment(post)
  const categoryLabel =
    params.category.charAt(0).toUpperCase() + params.category.slice(1)

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
      category={params.category}
      publicPath={publicPath}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: categoryLabel, path: `/blog/${params.category}` },
        { name: post.title, path: publicPath },
      ]}
      backHref="/blog"
      categoryArchiveHref={`/blog/${params.category}`}
      categoryLabel={categoryLabel}
      establishment={establishment}
    />
  )
}
