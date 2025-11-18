import { Store, Users, Target, Wrench, LucideIcon } from 'lucide-react'
import { EstablishmentType } from './types'

/**
 * Configuration for each establishment type
 */

interface EstablishmentConfig {
  icon: LucideIcon
  label: string
  labelPlural: string
  tableName: string
  blogForeignKey: string
  createQueryParam: string
  baseUrl: string
}

export const ESTABLISHMENT_CONFIG: Record<
  EstablishmentType,
  EstablishmentConfig
> = {
  stores: {
    icon: Store,
    label: 'Store',
    labelPlural: 'Stores',
    tableName: 'stores',
    blogForeignKey: 'store_id',
    createQueryParam: 'store_id',
    baseUrl: '/establishments/stores',
  },
  clubs: {
    icon: Users,
    label: 'Club',
    labelPlural: 'Clubs',
    tableName: 'clubs',
    blogForeignKey: 'club_id',
    createQueryParam: 'club_id',
    baseUrl: '/establishments/clubs',
  },
  ranges: {
    icon: Target,
    label: 'Range',
    labelPlural: 'Ranges',
    tableName: 'ranges',
    blogForeignKey: 'range_id',
    createQueryParam: 'range_id',
    baseUrl: '/establishments/ranges',
  },
  servicing: {
    icon: Wrench,
    label: 'Servicing',
    labelPlural: 'Servicing',
    tableName: 'servicing',
    blogForeignKey: 'servicing_id',
    createQueryParam: 'servicing_id',
    baseUrl: '/establishments/servicing',
  },
}

export function getEstablishmentConfig(type: EstablishmentType) {
  return ESTABLISHMENT_CONFIG[type]
}

