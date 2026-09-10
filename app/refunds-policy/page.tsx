import type { Metadata } from 'next'
import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { getSectionMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('refunds')
}

export default function RefundsPolicy() {
  return (
    <PageLayout>
      <PageHeader title="Refunds Policy" className="mb-4" />

      <p className="text-muted-foreground mb-1">
        Maltaguns.com — operated by Matchlock Group Ltd (C 116325)
      </p>
      <p className="text-muted-foreground mb-8">Last updated: 10/09/2026</p>

      <div className="prose prose-sm max-w-none text-foreground">
        <p>
          This policy applies to fees paid to Maltaguns for its own services:
          listing credits, featured listings, event listings and Establishment
          subscriptions. Maltaguns is never a party to transactions between
          users; the price of any item listed on the Platform is a matter
          exclusively between buyer and seller, and this policy does not apply
          to such transactions.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">1. Listing credits</h2>
        <p>
          <strong>Unused credits.</strong> Consumers may withdraw from the
          purchase of listing credits within 14 days of purchase and receive a
          full refund, provided the credits have not been used. Requests should
          be sent to{' '}
          <a href="mailto:info@maltaguns.com" className="underline">
            info@maltaguns.com
          </a>{' '}
          from the account&apos;s registered email address.
        </p>
        <p>
          <strong>Used credits.</strong> A credit is used when a listing is
          published. By publishing a listing you request immediate performance
          of the service and acknowledge that the right of withdrawal is lost in
          respect of that credit. Used credits are non-refundable.
        </p>
        <p>
          <strong>No expiry.</strong> Listing credits never expire. Credits not
          refunded within the 14-day withdrawal period remain valid and usable
          indefinitely; they are not refundable after that period but are never
          forfeited.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          2. Featured listings and event listings
        </h2>
        <p>
          Featured placements and event listings are non-refundable once live.
          If a featured placement or event listing fails to appear due to a
          fault on our part, we will at your option re-run the placement or
          refund the fee.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          3. Establishment subscriptions
        </h2>
        <p>
          Annual Establishment subscriptions are invoiced and payable in advance.
          Consumers benefit from the 14-day withdrawal period from the date of
          payment, provided the Establishment profile has not yet been activated
          at the subscriber&apos;s request. Once activated, subscriptions are
          non-refundable except where required by law. Business subscribers&apos;
          statutory rights are unaffected.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          4. Listings removed for policy breaches
        </h2>
        <p>
          No refund is due where a listing is removed, or an account suspended
          or terminated, for breach of our{' '}
          <Link href="/terms" className="underline">
            Terms and Conditions
          </Link>{' '}
          or{' '}
          <Link href="/prohibited-items" className="underline">
            Prohibited Items Policy
          </Link>
          , including removal of content reported to or at the request of the
          authorities.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          5. Payment issues and chargebacks
        </h2>
        <p>
          If a payment fails, is duplicated or is charged incorrectly, contact{' '}
          <a href="mailto:info@maltaguns.com" className="underline">
            info@maltaguns.com
          </a>{' '}
          before initiating a chargeback with your card issuer — our team
          monitors payments and can typically resolve issues within a short
          time. Duplicate or erroneous charges are refunded in full to the
          original payment method.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          6. Processing of refunds
        </h2>
        <p>
          Approved refunds are made to the original payment method within 14
          days of approval. Nothing in this policy affects your statutory
          rights under Maltese and EU consumer protection law.
        </p>
        <p>
          For refund requests or questions, contact{' '}
          <a href="mailto:info@maltaguns.com" className="underline">
            info@maltaguns.com
          </a>
          .
        </p>
      </div>
    </PageLayout>
  )
}
