'use client'

import Link from 'next/link'
import { Store, MapPin, Wrench, Users } from 'lucide-react'
import { StorageImage } from '@/components/ui/storage-image'
import { HomeSectionHeader } from './HomeSectionHeader'
import { HomeSectionShell } from './HomeSectionShell'

interface Establishment {
  id: string
  type: string
  slug?: string | null
  business_name: string
  location: string
  logo_url?: string | null
}

interface FeaturedEstablishmentsSectionProps {
  establishments: Establishment[]
}

const typeConfig: Record<string, { icon: typeof Store; label: string }> = {
  store: { icon: Store, label: 'Store' },
  range: { icon: MapPin, label: 'Range' },
  club: { icon: Users, label: 'Club' },
  servicing: { icon: Wrench, label: 'Servicing' },
}

function getTypeConfig(type: string) {
  return typeConfig[type] ?? { icon: Store, label: type }
}

export const FeaturedEstablishmentsSection = ({
  establishments,
}: FeaturedEstablishmentsSectionProps) => {
  const items = establishments.slice(0, 8)

  return (
    <HomeSectionShell tone="olive" className="py-12 lg:py-16">
      <HomeSectionHeader
        title="Establishments"
        description="Dealers, ranges, clubs, and servicing shops across Malta."
        href="/establishments"
        linkLabel="View all"
      />

      {items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map(establishment => {
            const config = getTypeConfig(establishment.type)
            const Icon = config.icon

            return (
              <Link
                key={`${establishment.type}-${establishment.id}`}
                href={`/establishments/${establishment.type === 'store' ? 'stores' : establishment.type}/${
                  establishment.slug || establishment.id
                }`}
                className="group block"
              >
                <div className="home-card h-full rounded-sm p-3 md:p-4 bg-[var(--home-surface)]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[var(--home-border)] bg-[var(--home-slate)]">
                      {establishment.logo_url ? (
                        <StorageImage
                          src={establishment.logo_url}
                          alt=""
                          width={40}
                          height={40}
                          sizes="40px"
                          fallbackSrc="/maltaguns.png"
                          className="h-7 w-7 object-contain"
                        />
                      ) : (
                        <Icon
                          className="h-4 w-4 text-[var(--home-amber)]"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--home-muted)]">
                      {config.label}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 text-[var(--home-ink)] group-hover:text-[var(--home-amber)] transition-colors">
                    {establishment.business_name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[var(--home-muted)]">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="line-clamp-1">
                      {establishment.location}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="py-6 text-sm text-[var(--home-muted)] border border-dashed border-[var(--home-border)] rounded-sm px-4 text-center">
          No featured establishments at the moment.
        </p>
      )}
    </HomeSectionShell>
  )
}
