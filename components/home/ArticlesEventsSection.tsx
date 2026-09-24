'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StorageImage } from '@/components/ui/storage-image'
import { HomeSectionShell } from './HomeSectionShell'
import { getBlogPostPublicPath } from '@/lib/blog-paths'

interface BlogPost {
  id: string
  title: string
  category: string
  slug: string
  featured_image: string | null
  created_at: string
  is_help_guide?: boolean
  author: {
    username: string
  }
}

interface Event {
  id: string
  title: string
  type: string
  start_date: string
  poster_url: string | null
  slug?: string | null
}

interface ArticlesEventsSectionProps {
  posts: BlogPost[]
  events: Event[]
  eventsArePast?: boolean
}

function SectionBlock({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string
  href: string
  linkLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-sm border border-[var(--home-border)] bg-[var(--home-surface)] p-5 md:p-6">
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-[var(--home-border)] pb-4">
        <h3 className="home-display text-sm font-bold uppercase tracking-widest text-[var(--home-ink)]">
          {title}
        </h3>
        <Link
          href={href}
          className="w-fit shrink-0 rounded-sm bg-[var(--home-brand)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[var(--home-brand-deep)] transition-colors"
        >
          {linkLabel}
        </Link>
      </div>
      {children}
    </div>
  )
}

export function ArticlesEventsSection({
  posts,
  events,
  eventsArePast = false,
}: ArticlesEventsSectionProps) {
  const articleItems = posts.slice(0, 4)
  const eventItems = events.slice(0, 4)

  return (
    <HomeSectionShell tone="muted">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <SectionBlock title="Articles" href="/blog" linkLabel="View all">
          {articleItems.length > 0 ? (
            <ul className="space-y-2">
              {articleItems.map(post => (
                <li key={post.id}>
                  <Link
                    href={getBlogPostPublicPath(
                      post.category,
                      post.slug,
                      post.is_help_guide
                    )}
                    className="group flex gap-3 border border-transparent p-3 transition-colors hover:border-[var(--home-border)] hover:bg-[var(--home-slate)]"
                  >
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-sm border border-[var(--home-border)] bg-[var(--home-slate)]">
                      {post.featured_image ? (
                        <StorageImage
                          src={post.featured_image}
                          alt={post.title}
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-5 w-5 text-[var(--home-amber)]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm line-clamp-2 text-[var(--home-ink)] group-hover:text-[var(--home-amber)] transition-colors">
                        {post.title}
                      </h4>
                      <p className="mt-1 text-xs text-[var(--home-muted)] tabular-nums">
                        {post.author.username} ·{' '}
                        {format(new Date(post.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-sm text-[var(--home-muted)] text-center">
              No articles published yet.
            </p>
          )}
        </SectionBlock>

        <SectionBlock
          title={eventsArePast ? 'Past events' : 'Events'}
          href="/events"
          linkLabel="View all"
        >
          {eventItems.length > 0 ? (
            <ul className="space-y-2">
              {eventItems.map(event => {
                const date = new Date(event.start_date)
                return (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.slug || event.id}`}
                      className="group flex gap-3 border border-transparent p-3 transition-colors hover:border-[var(--home-border)] hover:bg-[var(--home-slate)]"
                    >
                      <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-sm border border-[var(--home-border)] bg-[var(--home-slate)]">
                        <span className="text-[10px] font-medium text-[var(--home-amber)] tabular-nums">
                          {format(date, 'MMM')}
                        </span>
                        <span className="home-display text-xl font-bold leading-none text-[var(--home-ink)] tabular-nums">
                          {format(date, 'd')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="rounded-sm text-[10px] border border-[var(--home-border)] bg-transparent text-[var(--home-muted)] hover:bg-transparent"
                          >
                            {event.type}
                          </Badge>
                          {eventsArePast ? (
                            <Badge
                              variant="secondary"
                              className="rounded-sm text-[10px] border border-[var(--home-border)] bg-transparent text-[var(--home-muted)] hover:bg-transparent"
                            >
                              Past
                            </Badge>
                          ) : null}
                        </div>
                        <h4 className="font-medium text-sm line-clamp-2 text-[var(--home-ink)] group-hover:text-[var(--home-amber)] transition-colors">
                          {event.title}
                        </h4>
                      </div>
                      {event.poster_url ? (
                        <div className="relative hidden sm:block h-16 w-20 shrink-0 overflow-hidden rounded-sm border border-[var(--home-border)]">
                          <StorageImage
                            src={event.poster_url}
                            alt=""
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-6 text-sm text-[var(--home-muted)] text-center">
              No events to show at the moment.
            </p>
          )}
        </SectionBlock>
      </div>
    </HomeSectionShell>
  )
}
