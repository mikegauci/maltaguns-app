'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'
import { useCookieConsent } from '@/components/providers/CookieConsentProvider'
import { denyGoogleAnalytics } from '@/lib/cookie-consent'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function GoogleAnalytics() {
  const { consent } = useCookieConsent()
  const wasGranted = useRef(false)

  const analyticsEnabled = Boolean(consent?.analytics && GA_MEASUREMENT_ID)

  useEffect(() => {
    if (consent?.analytics && !GA_MEASUREMENT_ID) {
      console.warn(
        'Analytics consent granted but NEXT_PUBLIC_GA_MEASUREMENT_ID is not set.'
      )
    }
  }, [consent?.analytics])

  useEffect(() => {
    if (analyticsEnabled) {
      wasGranted.current = true
      return
    }

    if (wasGranted.current) {
      denyGoogleAnalytics()
    }
  }, [analyticsEnabled])

  if (!analyticsEnabled || !GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('js', new Date());
          gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}
