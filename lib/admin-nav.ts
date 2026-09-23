import {
  Banknote,
  Bell,
  Boxes,
  Calendar,
  CreditCard,
  FileText,
  Flag,
  HelpCircle,
  Home,
  Crosshair,
  IdCard,
  LayoutDashboard,
  MapPin,
  Package,
  Search,
  Store,
  Ticket,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavBadgeKey = 'armoryDealersPending'

export type AdminNavItem = {
  title: string
  href: string
  icon: LucideIcon
  description: string
  badgeKey?: AdminNavBadgeKey
}

export type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
}

export type SiteNavChild = {
  title: string
  href: string
  icon: LucideIcon
}

export type SiteNavItem = {
  title: string
  href: string
  icon: LucideIcon
  children?: SiteNavChild[]
}

export const ADMIN_OVERVIEW: AdminNavItem = {
  title: 'Overview',
  href: '/admin',
  icon: LayoutDashboard,
  description: 'Admin dashboard overview',
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'People',
    items: [
      {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
        description: 'Manage user accounts',
      },
      {
        title: 'Identity Reviews',
        href: '/admin/identity-reviews',
        icon: IdCard,
        description: 'Review Didit identity verifications',
      },
      {
        title: 'Armory Dealers',
        href: '/admin/armory-dealers',
        icon: Crosshair,
        description: 'Approve Armory dealership registrations',
        badgeKey: 'armoryDealersPending',
      },
      {
        title: 'Armory Audit',
        href: '/admin/armory-audit',
        icon: FileText,
        description: 'Cross-dealer Armory audit log',
      },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      {
        title: 'Listings',
        href: '/admin/listings',
        icon: Package,
        description: 'Manage marketplace listings',
      },
      {
        title: 'Reported Listings',
        href: '/admin/reported-listings',
        icon: Flag,
        description: 'Manage reported listings',
      },
      {
        title: 'Establishments',
        href: '/admin/establishments',
        icon: Store,
        description: 'Manage establishment profiles',
      },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        title: 'Events',
        href: '/admin/events',
        icon: Calendar,
        description: 'Manage events and schedules',
      },
      {
        title: 'Blogs',
        href: '/admin/blogs',
        icon: FileText,
        description: 'Manage blog posts',
      },
    ],
  },
  {
    label: 'Help',
    items: [
      {
        title: 'Help Center',
        href: '/admin/help',
        icon: HelpCircle,
        description: 'Manage help tabs and FAQs',
      },
      {
        title: 'Help Guides',
        href: '/admin/help/guides',
        icon: FileText,
        description: 'Create and assign help guides',
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        title: 'Credits',
        href: '/admin/credits',
        icon: CreditCard,
        description: 'Manage user credits',
      },
      {
        title: 'Event Credits',
        href: '/admin/event-credits',
        icon: Ticket,
        description: 'Manage event credits',
      },
      {
        title: 'Payments Received',
        href: '/admin/payments-received',
        icon: Banknote,
        description: 'View payment transactions',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        title: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
        description: 'Send manual notifications',
      },
      {
        title: 'SEO Settings',
        href: '/admin/seo',
        icon: Search,
        description: 'Manage site meta title and description',
      },
    ],
  },
]

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(
  group => group.items
)

export const SITE_NAV_ITEMS: SiteNavItem[] = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
  },
  {
    title: 'Establishments',
    href: '/establishments',
    icon: Store,
    children: [
      { title: 'All', href: '/establishments', icon: Boxes },
      { title: 'Stores', href: '/establishments/stores', icon: Store },
      { title: 'Clubs', href: '/establishments/clubs', icon: Users },
      { title: 'Servicing', href: '/establishments/servicing', icon: Wrench },
      { title: 'Ranges', href: '/establishments/ranges', icon: MapPin },
    ],
  },
  {
    title: 'Marketplace',
    href: '/marketplace',
    icon: Package,
  },
  {
    title: 'Events',
    href: '/events',
    icon: Calendar,
  },
  {
    title: 'Blog',
    href: '/blog',
    icon: FileText,
  },
  {
    title: 'Help',
    href: '/help',
    icon: HelpCircle,
  },
]

export function isAdminNavActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === '/admin'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
