'use client'

import { useEffect } from 'react'
import { useCookieConsent } from '@/components/providers/CookieConsentProvider'
import { denyGoogleAnalytics, grantGoogleAnalytics } from '@/lib/cookie-consent'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

/** Syncs banner consent choices with Google Consent Mode. */
export function GoogleAnalytics() {
  const { consent, isReady } = useCookieConsent()

  useEffect(() => {
    if (consent?.analytics && !GA_MEASUREMENT_ID) {
      console.warn(
        'Analytics consent granted but NEXT_PUBLIC_GA_MEASUREMENT_ID is not set.'
      )
    }
  }, [consent?.analytics])

  useEffect(() => {
    if (!isReady || !GA_MEASUREMENT_ID) return

    if (consent?.analytics) {
      grantGoogleAnalytics()
    } else {
      denyGoogleAnalytics()
    }
  }, [consent?.analytics, isReady])

  return null
}
