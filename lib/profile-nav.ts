import type { ArmoryContext } from '@/lib/armory/auth'

export type ProfileNavBadgeKey =
  'listings' | 'events' | 'establishments' | 'companyProfilePending'

export type ProfileNavBadgeVariant = 'count' | 'dot'

export type ProfileNavIconKey =
  | 'user'
  | 'package'
  | 'book-open'
  | 'calendar'
  | 'store'
  | 'credit-card'
  | 'truck'
  | 'users'
  | 'wallet'
  | 'file-text'
  | 'upload'
  | 'trash'

export type ProfileNavItem = {
  title: string
  href: string
  iconKey: ProfileNavIconKey
  badgeKey?: ProfileNavBadgeKey
  badgeVariant?: ProfileNavBadgeVariant
  hidden?: boolean
}

export type ProfileNavGroup = {
  label: string
  items: ProfileNavItem[]
}

export const PROFILE_ACCOUNT_NAV: ProfileNavItem[] = [
  {
    title: 'Profile',
    href: '/profile',
    iconKey: 'user',
  },
  {
    title: 'Listings',
    href: '/profile/listings',
    iconKey: 'package',
    badgeKey: 'listings',
  },
  {
    title: 'Blog',
    href: '/profile/blog',
    iconKey: 'book-open',
    hidden: true,
  },
  {
    title: 'Events',
    href: '/profile/events',
    iconKey: 'calendar',
    badgeKey: 'events',
  },
  {
    title: 'Business',
    href: '/profile/business',
    iconKey: 'store',
    badgeKey: 'establishments',
  },
  {
    title: 'Billing',
    href: '/profile/billing',
    iconKey: 'credit-card',
  },
]

const ARMORY_BASE = '/profile/armory'

export function buildArmoryNavItems(
  ctx: ArmoryContext | null
): ProfileNavItem[] {
  if (!ctx?.dealerAccount) {
    return [
      {
        title: 'Inventory',
        href: `${ARMORY_BASE}/inventory`,
        iconKey: 'package',
      },
      {
        title: 'Dealership',
        href: `${ARMORY_BASE}/register`,
        iconKey: 'store',
      },
    ]
  }

  const items: ProfileNavItem[] = [
    {
      title: 'Shipments',
      href: ARMORY_BASE,
      iconKey: 'truck',
    },
    {
      title: 'Inventory',
      href: `${ARMORY_BASE}/inventory`,
      iconKey: 'package',
    },
    {
      title: 'Buyers',
      href: `${ARMORY_BASE}/buyers`,
      iconKey: 'users',
    },
    {
      title: 'Accounting',
      href: `${ARMORY_BASE}/accounting`,
      iconKey: 'wallet',
    },
    {
      title: 'Documents',
      href: `${ARMORY_BASE}/documents`,
      iconKey: 'file-text',
    },
    {
      title: 'Import',
      href: `${ARMORY_BASE}/import`,
      iconKey: 'upload',
    },
    {
      title: 'Bin',
      href: `${ARMORY_BASE}/bin`,
      iconKey: 'trash',
    },
  ]

  if (ctx.staffRole === 'owner') {
    items.push({
      title: 'Team',
      href: `${ARMORY_BASE}/team`,
      iconKey: 'users',
    })
  }

  items.push({
    title: 'Company profile',
    href: `${ARMORY_BASE}/company-profile`,
    iconKey: 'store',
    badgeKey: 'companyProfilePending',
    badgeVariant: 'dot',
  })

  return items
}

export function buildProfileNavGroups(options: {
  canAccessBlog: boolean
  armoryCtx: ArmoryContext | null
}): ProfileNavGroup[] {
  const accountItems = PROFILE_ACCOUNT_NAV.map(item =>
    item.href === '/profile/blog'
      ? { ...item, hidden: !options.canAccessBlog }
      : item
  ).filter(item => !item.hidden)

  return [
    {
      label: 'Account',
      items: accountItems,
    },
    {
      label: 'Armory',
      items: buildArmoryNavItems(options.armoryCtx),
    },
  ]
}

export function isProfileNavActive(pathname: string, href: string) {
  if (href === '/profile') {
    return pathname === '/profile'
  }

  if (href === ARMORY_BASE) {
    return (
      pathname === ARMORY_BASE ||
      pathname.startsWith(`${ARMORY_BASE}/shipments`)
    )
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isProfilePrintRoute(pathname: string) {
  return pathname.startsWith(`${ARMORY_BASE}/print`)
}

export function isArmoryRoute(pathname: string) {
  return pathname.startsWith(ARMORY_BASE) && !isProfilePrintRoute(pathname)
}
