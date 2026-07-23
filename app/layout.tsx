import './globals.css'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import QueryProvider from '@/components/providers/QueryProvider'
import { CookieConsentProvider } from '@/components/providers/CookieConsentProvider'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { GoogleAnalyticsTag } from '@/components/analytics/GoogleAnalyticsTag'
import { CookieBanner } from '@/components/cookies/CookieBanner'
import { Toaster } from '@/components/ui/toaster'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import SupabaseProvider from '@/components/providers/SupabaseProvider'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'
import { getImpersonationState } from '@/lib/impersonation'
import { getSectionMetadata } from '@/lib/seo'
import { getAppUrl, isNonProductionHost } from '@/lib/seo-host'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={`${inter.className}${impersonation ? ' pt-10' : ''}`}>
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
                <Header />
                <main
                  className={
                    impersonation
                      ? 'min-h-[calc(100vh-64px-40px)]'
                      : 'min-h-[calc(100vh-64px)]'
                  }
                >
                  {children}
                </main>
                <Footer />
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
