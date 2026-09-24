import Link from 'next/link'
import { cn } from '@/lib/utils'

interface HomeSectionHeaderProps {
  title: string
  description?: string
  href?: string
  linkLabel?: string
  className?: string
}

export function HomeSectionHeader({
  title,
  description,
  href,
  linkLabel = 'View all',
  className,
}: HomeSectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 border-b border-[var(--home-border)] pb-6 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="max-w-2xl">
        <h2 className="home-display text-2xl font-bold uppercase tracking-tight text-[var(--home-ink)] md:text-3xl text-balance">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-prose text-sm text-[var(--home-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="w-fit shrink-0 self-start rounded-sm bg-[var(--home-brand)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[var(--home-brand-deep)] transition-colors"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}
