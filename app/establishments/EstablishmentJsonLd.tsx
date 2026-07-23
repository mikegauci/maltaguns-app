import { JsonLd } from '@/components/seo/JsonLd'
import { buildBreadcrumbList, buildLocalBusinessSchema } from '@/lib/seo-jsonld'
import type {
  EstablishmentType,
  EstablishmentWithDetails,
} from '@/app/establishments/types'

const TYPE_LABEL: Record<EstablishmentType, string> = {
  stores: 'Stores',
  clubs: 'Clubs',
  ranges: 'Ranges',
  servicing: 'Servicing',
}

export function EstablishmentJsonLd({
  establishment,
  type,
}: {
  establishment: EstablishmentWithDetails
  type: EstablishmentType
}) {
  const path = `/establishments/${type}/${establishment.slug}`

  return (
    <JsonLd
      data={[
        buildLocalBusinessSchema({
          type,
          name: establishment.business_name,
          description: establishment.description,
          image: establishment.logo_url,
          location: establishment.location,
          phone: establishment.phone,
          email: establishment.email,
          website: establishment.website,
          path,
        }),
        buildBreadcrumbList([
          { name: 'Home', path: '/' },
          { name: 'Establishments', path: '/establishments' },
          { name: TYPE_LABEL[type], path: `/establishments/${type}` },
          { name: establishment.business_name, path },
        ]),
      ]}
    />
  )
}
