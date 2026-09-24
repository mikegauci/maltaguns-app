import Link from 'next/link'
import { Store, Users, MapPin, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ViewTracker from '@/components/blog/ViewTracker'
import { BackButton } from '@/components/ui/back-button'
import { PageLayout } from '@/components/ui/page-layout'
import { BlogPostEditActions } from '@/components/blog/BlogPostEditActions'
import { StorageImage } from '@/components/ui/storage-image'
import { sanitizeBlogHtml } from '@/lib/sanitize-html'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildArticleSchema, buildBreadcrumbList } from '@/lib/seo-jsonld'

type EstablishmentInfo = {
  type: string
  name: string
  slug: string
}

type BlogPostViewProps = {
  post: {
    id: string
    title: string
    content: string
    slug: string
    featured_image: string | null
    created_at: string
    author_id: string
    meta_description?: string | null
  }
  authorUsername: string
  category: string
  publicPath: string
  breadcrumbs: { name: string; path: string }[]
  backHref: string
  categoryArchiveHref: string
  categoryLabel: string
  establishment: EstablishmentInfo | null
}

function getEstablishmentLink(establishment: EstablishmentInfo) {
  if (establishment.slug.startsWith('$slug$')) {
    const id = establishment.slug.replace('$slug$', '')
    if (id === '8f2fb68a-62a3-4a8f-9465-7181e442867f') {
      return `/establishments/${establishment.type}s/motor-element-test-3`
    }
    return `/establishments/${establishment.type}s/${id}`
  }
  return `/establishments/${establishment.type}s/${establishment.slug}`
}

function getEstablishmentIcon(type: string) {
  switch (type) {
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

export function resolveEstablishment(post: {
  store_id?: string | null
  club_id?: string | null
  range_id?: string | null
  servicing_id?: string | null
  store?: { id: string; business_name: string; slug: string }[] | null
  club?: { id: string; business_name: string; slug: string }[] | null
  range?: { id: string; business_name: string; slug: string }[] | null
  servicing?: { id: string; business_name: string; slug: string }[] | null
}): EstablishmentInfo | null {
  if (post.store_id) {
    if (post.store && post.store.length > 0) {
      return {
        type: 'store',
        name: post.store[0].business_name,
        slug: post.store[0].slug,
      }
    }
    return {
      type: 'store',
      name: 'Gun Store',
      slug: `$slug$${post.store_id}`,
    }
  }

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

export function resolveAuthorUsername(
  author: { username?: string } | { username?: string }[] | null | undefined
) {
  if (!author || typeof author !== 'object') return 'Unknown'

  if ('username' in author && typeof author.username === 'string') {
    return author.username
  }

  if (
    Array.isArray(author) &&
    author.length > 0 &&
    typeof author[0]?.username === 'string'
  ) {
    return author[0].username
  }

  return 'Unknown'
}

export function BlogPostView({
  post,
  authorUsername,
  category,
  publicPath,
  breadcrumbs,
  backHref,
  categoryArchiveHref,
  categoryLabel,
  establishment,
}: BlogPostViewProps) {
  return (
    <PageLayout>
      <JsonLd
        data={[
          buildArticleSchema({
            headline: post.title,
            description: post.meta_description || post.content,
            image: post.featured_image,
            datePublished: post.created_at,
            authorName: authorUsername,
            path: publicPath,
          }),
          buildBreadcrumbList(breadcrumbs),
        ]}
      />
      <ViewTracker postId={post.id} />
      <div className="flex justify-between items-center mb-8">
        <BackButton label="Back" href={backHref} hideLabelOnMobile={false} />
        <BlogPostEditActions
          category={category}
          slug={post.slug}
          authorId={post.author_id}
        />
      </div>

      <article className="prose prose-sm mx-auto max-w-none text-foreground">
        {post.featured_image && (
          <div className="relative mb-8 h-[220px] w-full overflow-hidden rounded-sm sm:h-[320px] md:h-[420px] lg:h-[550px]">
            <StorageImage
              src={post.featured_image}
              alt={post.title}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
              priority
            />
          </div>
        )}

        <div className="mb-8">
          <h1 className="mb-4">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>By {authorUsername}</span>
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
              href={categoryArchiveHref}
              className="text-primary hover:text-primary/80"
            >
              {categoryLabel}
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
                    {getEstablishmentIcon(establishment.type)}
                    {establishment.name}
                  </Badge>
                </Link>
              </>
            )}
          </div>
        </div>

        <div
          dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
        />
      </article>
    </PageLayout>
  )
}
