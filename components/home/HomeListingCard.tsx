'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { StorageImage } from '@/components/ui/storage-image'
import { cn } from '@/lib/utils'
import { formatPrice, slugify } from '@/lib/format'

interface HomeListingCardProps {
  id: string
  title: string
  price: number
  thumbnail: string | null
  featured?: boolean
  className?: string
}

export function HomeListingCard({
  title,
  price,
  thumbnail,
  featured = false,
  className,
}: HomeListingCardProps) {
  return (
    <Link
      href={`/marketplace/listing/${slugify(title)}`}
      className={cn('block h-full group', className)}
    >
      <Card
        className={cn(
          'home-card overflow-hidden h-full shadow-none rounded-sm bg-[var(--home-surface)]',
          featured && 'border-t-2 border-t-[var(--home-brand)]'
        )}
      >
        <div className="aspect-video relative overflow-hidden border-b border-[var(--home-border)]">
          <StorageImage
            src={thumbnail}
            alt={title}
            className="object-cover opacity-95 group-hover:opacity-100 transition-opacity"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {featured ? (
            <span className="home-callout absolute top-2 left-2 bg-black/80">
              Featured
            </span>
          ) : null}
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm mb-1 line-clamp-1 text-[var(--home-ink)] group-hover:text-[var(--home-amber)] transition-colors">
            {title}
          </h3>
          <p className="text-sm font-semibold text-[var(--home-amber)] tabular-nums">
            {formatPrice(price)}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
