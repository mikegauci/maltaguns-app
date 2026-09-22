import './globals.css'
import '../styles/design-tokens.css'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Oswald, IBM_Plex_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import QueryProvider from '@/components/providers/QueryProvider'
import { CookieConsentProvider } from '@/components/providers/CookieConsentProvider'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { GoogleAnalyticsTag } from '@/components/analytics/GoogleAnalyticsTag'
import { CookieBanner } from '@/components/cookies/CookieBanner'
import { Toaster } from '@/components/ui/toaster'
import { AppChrome } from '@/components/layout/AppChrome'
import SupabaseProvider from '@/components/providers/SupabaseProvider'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import { getImpersonationState } from '@/lib/impersonation'
import { getSectionMetadata } from '@/lib/seo'
import { getAppUrl, isNonProductionHost } from '@/lib/seo-host'

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-home-display',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-home-body',
})

export async function generateMetadata(): Promise<Metadata> {
  const homeMetadata = await getSectionMetadata('home')
  const host = (await headers()).get('host')
  const previewNoIndex = isNonProductionHost(host)

  return {
    metadataBase: new URL(getAppUrl()),
    icons: {
      icon: [{ url: '/favicon.png', type: 'image/png', sizes: '32x32' }],
      apple: [{ url: '/favicon.png', type: 'image/png', sizes: '150x150' }],
    },
    ...homeMetadata,
    ...(previewNoIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const impersonation = await getImpersonationState()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;if(!p.startsWith('/admin')&&!p.startsWith('/profile/armory/print')){document.documentElement.classList.add('app-dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${ibmPlexSans.className} ${oswald.variable} ${ibmPlexSans.variable}${impersonation ? ' pt-10' : ''}`}
      >
        <GoogleAnalyticsTag />
        <QueryProvider>
          <SupabaseProvider>
            <ThemeProvider>
              <CookieConsentProvider>
                {impersonation && (
                  <ImpersonationBanner
                    adminUsername={impersonation.adminUsername}
                    targetUsername={impersonation.targetUsername}
                  />
                )}
                <AppChrome impersonation={Boolean(impersonation)}>
                  {children}
                </AppChrome>
                <CookieBanner />
                <GoogleAnalytics />
                <Toaster />
              </CookieConsentProvider>
            </ThemeProvider>
          </SupabaseProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
