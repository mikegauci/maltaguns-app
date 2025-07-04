import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | MaltaGuns',
  description:
    'Privacy Policy for MaltaGuns - Your trusted source for firearms information, marketplace listings, and community events in Malta.',
}

export default function PrivacyPolicy() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <p className="text-muted-foreground mb-8">Effective Date: 15/04/2025</p>

      <div className="prose prose-sm max-w-none text-foreground">
        <p>
          Maltaguns.com ("Platform") is owned and operated by Strawberry Orange
          Digital, a Cyprus-based company with registered offices at Spyrou
          Kyprianou, 10, Office 22, Mesa Geitonia, 4001, Limassol, Cyprus ("we",
          "us", or "our"). This Privacy Policy explains how we collect, use, and
          protect your personal data when you use our Platform.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          1. Personal Data We Collect
        </h2>
        <p>We may collect and process the following personal data:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Name and contact information (email, phone number, etc.)</li>
          <li>User account details and login credentials</li>
          <li>Business license documents (for commercial sellers)</li>
          <li>Listing content and related metadata</li>
          <li>
            Event submissions and related details (e.g., title, time, venue,
            organiser info)
          </li>
          <li>Preferences related to featured listings or promoted content</li>
          <li>IP address and browser/device details</li>
          <li>Usage logs and interaction data</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          2. Purpose and Legal Basis for Processing
        </h2>
        <p>We process your data for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>To create and manage your user account</li>
          <li>
            To publish listings and display seller or event organiser contact
            details
          </li>
          <li>
            To verify legal eligibility for regulated listings (e.g., firearms,
            ammunition)
          </li>
          <li>To manage and display user-submitted events</li>
          <li>
            To facilitate optional upgrades like featured listings or
            promotional packages
          </li>
          <li>To respond to support requests or legal obligations</li>
          <li>To improve platform functionality and security</li>
        </ul>
        <p>
          The legal basis includes: Consent, contract performance, legal
          obligations, and legitimate interests.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          3. Who Has Access to Your Data
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Our internal staff and trusted service providers (e.g., hosting and
            analytics providers)
          </li>
          <li>
            Government authorities if or where legally required (e.g., licensing
            bodies)
          </li>
          <li>
            Other users (contact details you voluntarily post in listings or
            event entries)
          </li>
        </ul>
        <p>We do not sell your data to third parties.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          4. Data Storage and Retention
        </h2>
        <p>Your data is stored on secure EU-based servers. We retain data:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>While your account is active</li>
          <li>
            Up to 5 years after account closure unless required longer by law
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">5. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Access your data</li>
          <li>Correct inaccurate information</li>
          <li>Delete your account and associated data</li>
          <li>Object to processing</li>
        </ul>
        <p>
          If you believe your data protection rights have been violated, you
          have the right to complain to a supervisory authority.
        </p>
        <p>Our lead supervisory authority is the:</p>
        <p className="font-medium">
          Office of the Commissioner for Personal Data Protection (Cyprus)
        </p>
        <ul className="pl-6 space-y-1">
          <li>
            Website:{' '}
            <a
              href="https://www.dataprotection.gov.cy"
              className="text-primary hover:underline"
            >
              https://www.dataprotection.gov.cy
            </a>
          </li>
          <li>Email: commissioner@dataprotection.gov.cy</li>
          <li>Address: Iasonos 1, 1082 Nicosia, Cyprus</li>
          <li>Tel: +357 22 818 456</li>
        </ul>
        <p className="mt-4">
          Alternatively, if you are based in Malta or believe the issue concerns
          Maltese jurisdiction, you may also contact:
        </p>
        <p className="font-medium">
          Information and Data Protection Commissioner (Malta)
        </p>
        <ul className="pl-6 space-y-1">
          <li>
            Website:{' '}
            <a
              href="https://idpc.org.mt"
              className="text-primary hover:underline"
            >
              https://idpc.org.mt
            </a>
          </li>
          <li>Email: idpc.info@idpc.org.mt</li>
          <li>
            Address: Level 2, Airways House, High Street, Sliema SLM 1549, Malta
          </li>
          <li>Tel: +356 2328 7100</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          6. Cookies and Tracking
        </h2>
        <p>We use cookies to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Maintain session state</li>
          <li>Analyse site traffic (via Google Analytics or similar tools)</li>
        </ul>
        <p>You can manage your cookie preferences in your browser settings.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          7. Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. Material changes
          will be communicated via email or Platform notification.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">8. Contact Us</h2>
        <p>For data protection inquiries:</p>
        <ul className="pl-6 space-y-1">
          <li>Email: info@strawberryorangedigital.com</li>
          <li>
            Postal: Strawberry Orange Digital, Spyrou Kyprianou, 10, Office 22,
            Mesa Geitonia, 4001, Limassol, Cyprus
          </li>
        </ul>
      </div>
    </div>
  )
}
