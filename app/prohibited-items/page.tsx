import type { Metadata } from 'next'
import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('prohibited_items')
}

export default function ProhibitedItemsPolicy() {
  return (
    <PageLayout>
      <PageHeader title="Prohibited Items Policy" className="mb-4" />

      <p className="text-muted-foreground mb-1">
        Maltaguns.com — operated by Matchlock Group Ltd (C 116325)
      </p>
      <p className="text-muted-foreground mb-8">Last updated: 10/09/2026</p>

      <div className="prose prose-sm max-w-none text-foreground">
        <p>
          This policy forms part of our Terms and Conditions and applies to all
          listings on the Platform. Listings that breach this policy are
          removed. Where a breach may also constitute a breach of the Arms Act
          (Chapter 480 of the Laws of Malta) or any other law, we report the
          matter to the Malta Police Force together with all information we
          hold, and we cooperate fully with any investigation.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          1. Items that may never be listed
        </h2>
        <p>
          The following may not be listed by any user, under any circumstances:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Silencers, suppressors and sound moderators</li>
          <li>
            Explosives, gunpowder, propellants and primers, other than as
            permitted under Section 2 below
          </li>
          <li>
            Ammunition with expanding, explosive, incendiary or armour-piercing
            projectiles
          </li>
          <li>Firearms disguised as other objects</li>
          <li>
            Firearms with removed, altered or defaced serial numbers or markings
          </li>
          <li>
            Stolen items, or items the seller does not own or is not authorised
            to sell
          </li>
          <li>
            Home-manufactured or 3D-printed firearms or essential components
            (barrels, frames, receivers, slides, cylinders, bolts or breech
            blocks)
          </li>
          <li>
            Reactivated firearms, and &quot;deactivated&quot; firearms without a
            deactivation certificate compliant with Commission Implementing
            Regulation (EU) 2015/2403
          </li>
          <li>
            Prohibited weapons under Schedule I of the Arms Act not falling
            within a licensed collector category, including knuckledusters and
            flick knives
          </li>
          <li>
            Pepper sprays, stun guns, tasers and other prohibited self-defence
            devices
          </li>
          <li>
            Any other item whose sale, advertising or possession would breach
            the Arms Act or any other applicable law
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          2. Items restricted to specific licence holders
        </h2>
        <p>
          Firearms may be listed only by users whose firearms licence issued by
          the Commissioner of Police has been verified by Maltaguns, and are
          visible only to verified licence holders whose licence class permits
          acquisition of the item concerned.
        </p>
        <p>
          Ammunition and gunpowder may be listed only by verified, licensed gun
          dealers registered as Establishments. Private individuals are strictly
          prohibited from listing, advertising or selling ammunition or
          gunpowder.
        </p>
        <p>
          Automatic firearms are prohibited weapons under Schedule I, Part I of
          the Arms Act and are strictly restricted on the Platform: they may be
          listed only by verified holders of a Collector&apos;s Licence issued
          under article 11 of the Arms Act, which authorises the possession of
          antique firearms notwithstanding Schedule I, and only in respect of
          firearms manufactured before 1st January 1946 (the statutory
          definition of an antique weapon under article 2 of the Arms Act). Such
          listings are visible only to verified users who are themselves
          eligible to acquire the item, and any transfer remains subject to the
          approval of the Malta Police Weapons Office.
        </p>
        <p>
          Knives and edged weapons may not be sold or delivered to persons under
          18 years of age (article 21, Arms Act).
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          3. Prohibited practices
        </h2>
        <p>
          It is prohibited to list items under incorrect categories; to use
          misleading tags, descriptions or pricing; to advertise regulated items
          without the required licence; to post fraudulent, inaccurate or
          infringing content; or to use listings to market unrelated items,
          services or external platforms. See Section 4(c) of our{' '}
          <Link href="/terms" className="underline">
            Terms and Conditions
          </Link>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">4. Enforcement</h2>
        <p>
          Every listing carries a Report button. Reported listings are reviewed
          with priority and paused during investigation. Breaches result in
          listing removal and a warning; repeated or serious breaches result in
          account suspension or termination. Suspected breaches of the Arms Act
          are escalated to the Malta Police Force. Maltaguns does not notify
          users of reports made to the authorities.
        </p>
        <p>
          For questions about this policy, contact{' '}
          <a href="mailto:info@maltaguns.com" className="underline">
            info@maltaguns.com
          </a>
          .
        </p>
      </div>
    </PageLayout>
  )
}
