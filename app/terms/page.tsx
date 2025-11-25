import { Metadata } from 'next'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = {
  title: 'Terms and Conditions | MaltaGuns',
  description:
    'Terms and Conditions for MaltaGuns - Your trusted source for firearms information, marketplace listings, and community events in Malta.',
}

export default function TermsAndConditions() {
  return (
    <PageLayout innerClassName="max-w-4xl">
      <PageHeader
        title="Terms and Conditions"
        className="mb-6"
      />

      <div className="prose prose-sm max-w-none text-foreground">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          1. General Information
        </h2>
        <p>
          These Terms and Conditions ("Terms") govern access to and use of the
          website www.maltaguns.com (the "Platform") operated by Strawberry
          Orange Digital, a private limited company registered in Cyprus, with
          registered offices at:
        </p>
        <p className="pl-6">
          Spyrou Kyprianou, 10, Office 22, Mesa Geitonia, 4001, Limassol, Cyprus
        </p>
        <p>
          (hereinafter referred to as "Maltaguns", "we", "our", or "the
          Operator"). By accessing or using Maltaguns, you agree to be bound by
          these Terms. If you do not agree, you may not use the Platform.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          2. Scope of Services
        </h2>
        <p>
          Maltaguns provides an online marketplace, news and event-sharing
          platform for the collecting and shooting sports community in Malta,
          enabling registered users to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Post listings to sell goods and services related to airsoft
            equipment, firearms, Militaria collecting, shooting sports, repair
            and restoration.
          </li>
          <li>
            View listings and obtain the seller's direct contact information
            after completing account verification.
          </li>
        </ul>
        <p>
          Maltaguns also provides a feature for users to create and publish
          event listings on a shared community calendar. Events may include but
          are not limited to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Airsoft games and meetups</li>
          <li>Shooting competitions or charity fundraisers</li>
          <li>Firearms safety courses or training</li>
          <li>Club-hosted open days or product demos</li>
        </ul>
        <p>
          Event creation is a paid feature, and events are publicly visible on
          the Maltaguns calendar. Maltaguns does not facilitate messaging,
          transactions, or negotiations. All communication between users happens
          externally and at their own discretion and risk. Maltaguns acts solely
          as an intermediary content host and is not a party to any transaction.
          We do not own, inspect, mediate, or guarantee any of the items listed
          on the Platform.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          3. Registration and Account Use
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Users must be 18 years or older</li>
          <li>
            Users selling firearms or any item which requires a police transfer
            may only do so after proving that they are legally permitted under
            Maltese law to own and handle firearm-related items.
          </li>
          <li>
            Each user is allowed one account. Accounts are non-transferable.
          </li>
          <li>Accurate and complete personal information must be provided.</li>
          <li>
            Users must protect login credentials and are responsible for all
            account activity.
          </li>
          <li>
            Users must not post items for sale that do not belong to them.
          </li>
          <li>Users must not misuse the report listing feature.</li>
          <li>
            Users understand and acknowledge that breaking any of these rules
            may lead to account suspension or termination.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          4. Use of the Platform and User Responsibilities
        </h2>
        <h3 className="text-lg font-medium mt-6 mb-2">
          a. Legality of Content and Transactions
        </h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Users are solely responsible for ensuring that listings comply with
            Maltese and EU laws, especially the Arms Act (Cap. 480) and relevant
            licensing requirements.
          </li>
          <li>
            Sellers must ensure that regulated items are only sold to licensed
            persons, and verify documentation before arranging a viewing and
            also at the time of transfer.
          </li>
          <li>
            Maltaguns assume no role in verifying transactions, licenses, or the
            outcome of any contact between users.
          </li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-2">
          b. Restrictions on Ammunition and Gunpowder
        </h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Private individuals are strictly prohibited from listing,
            advertising, or selling ammunition or gunpowder on the Platform.
          </li>
          <li>
            Only verified and licensed gun stores that are registered as
            Establishments may list such items after verification.
          </li>
          <li>
            Violating listings will be removed, and accounts may be suspended or
            terminated.
          </li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-2">
          c. Prohibited Items and Practices
        </h3>
        <p>It is prohibited to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            List items under incorrect categories or use misleading tags or
            pricing.
          </li>
          <li>
            Sell or advertise firearms, ammunition, or accessories without
            proper licensing.
          </li>
          <li>Post fraudulent, inaccurate, or infringing content.</li>
          <li>
            Post items with images that are not yours or authorised to be used.
          </li>
          <li>
            Use the platform to advertise unrelated services or external
            platforms.
          </li>
          <li>
            Chang the entire content of a paid listing to market a second item
            utilizing a singular paid listing credit.
          </li>
          <li>
            Post a service or irrelevant content in a listing title or
            description
          </li>
          <li>
            Post listing images with marketing material, promotions, offensive
            or illegal content.
          </li>
        </ul>
        <p>
          Maltaguns reserves the right to remove content or suspend accounts
          that violate these rules, are reported by users or for any other
          reason Maltaguns sees fit at its discretion.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          5. Contact Information Sharing
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Maltaguns displays the contact information provided by sellers
            directly within each listing only to verified user accounts.
          </li>
          <li>
            It is the responsibility of interested buyers to contact sellers
            independently using this information.
          </li>
          <li>
            Maltaguns does not provide messaging tools or a communication relay
            system.
          </li>
          <li>
            We do not monitor, record, or interfere with communications between
            users.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          6. Verification and Licensing
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Maltaguns may request proof of firearms licenses, club memberships,
            or business registration before allowing listings or enterprises to
            set up accounts or post listings.
          </li>
          <li>
            Only verified commercial sellers may list regulated goods like
            ammunition or gunpowder.
          </li>
          <li>
            Even if a user does not wish to sell firearms, Maltaguns reserves
            the right to request identity verification documentation.
          </li>
          <li>
            Failure to comply or provide documentation may result in listing
            removal or account suspension.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          7. Commercial Sellers and Establishments
        </h2>
        <p>
          Establishments such as gun stores, restorers, shooting ranges, and
          clubs may register under Establishment accounts for a fee.
          Requirements include:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Providing valid documentation such as business registration, VAT
            number, and licenses.
          </li>
          <li>Compliance with consumer protection regulations.</li>
          <li>
            Authorisation to post Blogs will be allowed only to verified
            Establishments
          </li>
        </ul>
        <p>
          Commercial sellers may access additional features, such as premium
          listing placement and content contribution opportunities. Contact
          info@maltaguns.com for more information.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          8. Fees and Payments
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Individual Users can post non-firearm listings on the Platform free
            of charge
          </li>
          <li>
            Firearm listings can be posted on the platform only after a fee has
            been paid for listing credits.
          </li>
          <li>
            Optional premium features (e.g., featured listings) will incur fees.
          </li>
          <li>All prices are inclusive of VAT where applicable.</li>
          <li>
            Non-payment of applicable fees may result in feature restriction or
            suspension.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          9. Content and Intellectual Property
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Users grant Maltaguns a non-exclusive, royalty-free license to
            display and promote their submitted content (text and images) not
            only on the Maltaguns website but also on associated social media
            channels.
          </li>
          <li>
            Maltaguns may use user content for external promotion (e.g., social
            media, newsletters).
          </li>
          <li>
            Users must not use, copy, or reproduce others' content without
            permission.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          10. Liability and Disclaimers
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Maltaguns is not responsible for the accuracy, legality, or outcome
            of user-generated listings or any communication or transaction
            resulting from the Platform.
          </li>
          <li>
            We do not verify items, buyers, conditions, images or claims made in
            listings.
          </li>
          <li>
            Users act at their own risk. The Operator is not liable for any
            disputes, losses, or damage arising from use of the Platform.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          11. Enforcement, Sanctions, and Termination
        </h2>
        <p>Maltaguns reserves the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Remove any listing or account found in violation of these Terms.
          </li>
          <li>Request additional verification documents at any time.</li>
          <li>Permanently ban users for serious or repeated violations.</li>
        </ul>
        <p>
          Users may terminate their accounts at any time via written request.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          12. Amendments to These Terms
        </h2>
        <p>
          We may update these Terms to reflect legal or operational changes.
          Users will be notified via email. Continued use of the Platform after
          updates indicates acceptance of the revised Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          13. Governing Law and Jurisdiction
        </h2>
        <p>
          These Terms are governed by the laws of the Republic of Cyprus,
          without regard to conflict of laws principles. Any disputes arising
          from or relating to the use of this Platform shall be subject to the
          exclusive jurisdiction of the courts of Limassol, Cyprus. Users are
          solely responsible for complying with local laws and regulations,
          including but not limited to Maltese firearms and licensing laws, when
          using the Platform or engaging in transactions.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          14. Contact Information
        </h2>
        <p>For support, legal queries, or data protection concerns, contact:</p>
        <p className="pl-6">
          Strawberry Orange Digital
          <br />
          Spyrou Kyprianou, 10
          <br />
          Office 22
          <br />
          Mesa Geitonia, 4001
          <br />
          Limassol, Cyprus
          <br />
          Email: info@strawberryorangedigital.com
        </p>
      </div>
    </PageLayout>
  )
}
