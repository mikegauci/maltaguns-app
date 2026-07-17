import type { Metadata } from 'next'
import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { getSectionMetadata } from '@/lib/seo'
import { CookieSettingsButton } from '@/components/cookies/CookieSettingsButton'

export async function generateMetadata(): Promise<Metadata> {
  return getSectionMetadata('cookies')
}

export default function CookiePolicy() {
  return (
    <PageLayout>
      <PageHeader title="Cookie Policy" className="mb-4" />

      <p className="text-muted-foreground mb-8">Effective Date: 17/07/2026</p>

      <div className="prose prose-sm max-w-none text-foreground">
        <p>
          This Cookie Policy explains how Maltaguns.com (&quot;Platform&quot;),
          operated by Strawberry Orange Digital, uses cookies and similar
          technologies. For broader information about personal data, see our{' '}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          1. What are cookies?
        </h2>
        <p>
          Cookies are small text files stored on your device when you visit a
          website. We also use related storage (such as localStorage) for
          similar purposes. Together, these technologies help the site function,
          remember preferences, and — if you allow it — understand how the site
          is used.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          2. Cookies and storage we use
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-2">Essential</h3>
        <p>Required for the Platform to work. These do not require consent.</p>
        <div className="not-prose overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Name / provider</th>
                <th className="py-2 pr-4 font-medium">Purpose</th>
                <th className="py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b align-top">
                <td className="py-2 pr-4">
                  Supabase auth cookies
                  <br />
                  <span className="text-xs">
                    typically <code className="text-xs">sb-*-auth-token</code>
                  </span>
                </td>
                <td className="py-2 pr-4">
                  Keep you signed in and authorize protected actions
                </td>
                <td className="py-2">First-party cookie</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4">
                  Supabase session
                  <br />
                  <span className="text-xs">
                    localStorage keys containing
                  </span>{' '}
                  <code className="text-xs">supabase</code>
                </td>
                <td className="py-2 pr-4">
                  Client-side session continuity with our authentication
                  provider
                </td>
                <td className="py-2">localStorage</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4">
                  <code className="text-xs">redirectAfterLogin</code>
                </td>
                <td className="py-2 pr-4">
                  Return you to the page you intended after signing in
                </td>
                <td className="py-2">localStorage</td>
              </tr>
              <tr className="border-b align-top">
                <td className="py-2 pr-4">
                  Stripe (checkout)
                  <br />
                  <span className="text-xs">stripe.com / js.stripe.com</span>
                </td>
                <td className="py-2 pr-4">
                  Process payments when you buy credits or paid features
                </td>
                <td className="py-2">Third-party (payment)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-2">Preferences</h3>
        <div className="not-prose overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Purpose</th>
                <th className="py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b align-top">
                <td className="py-2 pr-4">
                  <code className="text-xs">maltaguns-cookie-consent</code>
                </td>
                <td className="py-2 pr-4">
                  Store your cookie choices so we do not ask again on every
                  visit
                </td>
                <td className="py-2">localStorage</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-2">
          Analytics (optional)
        </h3>
        <p>
          The Google tag loads on every page with Consent Mode defaults set to
          denied (no analytics cookies until you opt in). Analytics storage is
          enabled only after you accept via the cookie banner or Cookie
          settings.
          {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? (
            <>
              {' '}
              Measurement ID: {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}{' '}
              (Google Analytics 4).
            </>
          ) : (
            <> We use Google Analytics 4 when configured.</>
          )}
        </p>
        <div className="not-prose overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Name / provider</th>
                <th className="py-2 pr-4 font-medium">Purpose</th>
                <th className="py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b align-top">
                <td className="py-2 pr-4">
                  Google Analytics
                  <br />
                  <span className="text-xs">
                    typically <code className="text-xs">_ga</code>,{' '}
                    <code className="text-xs">_ga_*</code>
                  </span>
                </td>
                <td className="py-2 pr-4">
                  Measure traffic and how visitors use the Platform
                </td>
                <td className="py-2">Third-party cookie</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-2">
          First-party usage counts
        </h3>
        <p>
          Some pages (such as blog posts) may record a simple view count on our
          own servers. This does not set third-party analytics cookies.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">
          3. Managing your preferences
        </h2>
        <p>
          On your first visit, you can accept cookies or reject non-essential
          cookies. You can change your mind at any time using Cookie settings in
          the footer, or the button below.
        </p>
        <p className="not-prose mt-4">
          <CookieSettingsButton />
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">4. Contact</h2>
        <p>
          For questions about cookies or privacy, contact us at{' '}
          <a href="mailto:info@maltaguns.com">info@maltaguns.com</a>.
        </p>
      </div>
    </PageLayout>
  )
}
