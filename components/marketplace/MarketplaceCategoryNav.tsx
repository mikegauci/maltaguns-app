import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'

const categories = [
  {
    title: 'Firearms',
    icon: (
      <Image
        src="/images/pistol-gun-icon.svg"
        alt=""
        width={16}
        height={16}
        aria-hidden
      />
    ),
    href: '/marketplace/firearms',
    subcategories: [
      { name: 'Airguns', href: '/marketplace/firearms/airguns' },
      { name: 'Ammunition', href: '/marketplace/firearms/ammunition' },
      { name: 'Black Powder', href: '/marketplace/firearms/black-powder' },
      { name: 'Carbines', href: '/marketplace/firearms/carbines' },
      { name: 'Crossbow', href: '/marketplace/firearms/crossbow' },
      { name: 'Pistols', href: '/marketplace/firearms/pistols' },
      {
        name: 'Replica/Deactivated',
        href: '/marketplace/firearms/replica-deactivated',
      },
      { name: 'Revolvers', href: '/marketplace/firearms/revolvers' },
      { name: 'Rifles', href: '/marketplace/firearms/rifles' },
      { name: 'Schedule 1', href: '/marketplace/firearms/schedule-1' },
      { name: 'Shotguns', href: '/marketplace/firearms/shotguns' },
    ],
  },
  {
    title: 'Non-Firearms',
    icon: <Package className="h-4 w-4" aria-hidden />,
    href: '/marketplace/non-firearms',
    subcategories: [
      { name: 'Airsoft', href: '/marketplace/non-firearms/airsoft' },
      { name: 'Reloading', href: '/marketplace/non-firearms/reloading' },
      { name: 'Militaria', href: '/marketplace/non-firearms/militaria' },
      { name: 'Accessories', href: '/marketplace/non-firearms/accessories' },
    ],
  },
]

export function MarketplaceCategoryNav() {
  return (
    <div className="mb-8 rounded-lg border bg-card p-3 sm:p-4 text-center">
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 md:gap-x-8">
        {categories.map(category => (
          <div key={category.title} className="flex flex-col items-center">
            <Link
              href={category.href}
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
            >
              {category.icon}
              {category.title}
            </Link>
            <div className="flex flex-wrap justify-center gap-1.5">
              {category.subcategories.map(subcategory => (
                <Link
                  key={subcategory.name}
                  href={subcategory.href}
                  className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {subcategory.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
