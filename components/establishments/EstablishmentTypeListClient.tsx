'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AppCard } from '@/components/design-system'
import {
  LucideIcon,
  MapPin,
  Phone,
  Mail,
  Globe,
  Store,
  Users,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'

export type EstablishmentListItem = {
  id: string
  business_name: string
  logo_url: string | null
  location: string
  phone: string | null
  email: string | null
  description: string | null
  website: string | null
  slug: string
}

export type EstablishmentListIcon = 'stores' | 'clubs' | 'ranges' | 'servicing'

const ESTABLISHMENT_ICONS: Record<EstablishmentListIcon, LucideIcon> = {
  stores: Store,
  clubs: Users,
  ranges: MapPin,
  servicing: Wrench,
}

type EstablishmentTypeListClientProps = {
  items: EstablishmentListItem[]
  title: string
  description: string
  routePrefix: string
  emptyLabel: string
  icon: EstablishmentListIcon
}

export function EstablishmentTypeListClient({
  items,
  title,
  description,
  routePrefix,
  emptyLabel,
  icon,
}: EstablishmentTypeListClientProps) {
  const Icon = ESTABLISHMENT_ICONS[icon]

  return (
    <PageLayout>
      <PageHeader
        align="center"
        backHref="/establishments"
        title={title}
        description={description}
      />

      {items.length === 0 ? (
        <Card className="p-6 text-center">
          <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyLabel}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <Link key={item.id} href={`${routePrefix}/${item.slug || item.id}`}>
              <AppCard className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {item.logo_url ? (
                      <img
                        src={item.logo_url}
                        alt={item.business_name}
                        className="w-16 h-16 object-contain rounded-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center">
                        <Icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {item.business_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{item.location}</span>
                      </div>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {item.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{item.phone}</span>
                      </div>
                    )}
                    {item.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{item.email}</span>
                      </div>
                    )}
                    {item.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>{item.website}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </AppCard>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
