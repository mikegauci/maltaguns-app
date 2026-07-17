import './globals.css'
import type { Metadata } from 'next'
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
import { getAppUrl, getSectionMetadata } from '@/lib/seo'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const homeMetadata = await getSectionMetadata('home')

  return {
    metadataBase: new URL(getAppUrl()),
    icons: {
      icon: [{ url: '/favicon.png', type: 'image/png', sizes: '32x32' }],
    },
    ...homeMetadata,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleAnalyticsTag />
        <QueryProvider>
          <SupabaseProvider>
            <ThemeProvider>
              <CookieConsentProvider>
                <Header />
                <main className="min-h-[calc(100vh-64px)]">{children}</main>
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
