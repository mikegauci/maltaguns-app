'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  type CookieConsent,
  DEFAULT_CONSENT,
  denyGoogleAnalytics,
  getConsent,
  setConsent as persistConsent,
} from '@/lib/cookie-consent'

type CookieConsentContextValue = {
  consent: CookieConsent | null
  hasAnswered: boolean
  isReady: boolean
  preferencesOpen: boolean
  setConsent: (consent: CookieConsent) => void
  openPreferences: () => void
  closePreferences: () => void
}

const CookieConsentContext = createContext<
  CookieConsentContextValue | undefined
>(undefined)

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [consent, setConsentState] = useState<CookieConsent | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  useEffect(() => {
    setConsentState(getConsent())
    setHydrated(true)
  }, [])

  const setConsent = useCallback((next: CookieConsent) => {
    const previous = getConsent()
    const normalized: CookieConsent = {
      essential: true,
      analytics: next.analytics,
    }
    persistConsent(normalized)
    setConsentState(normalized)
    setPreferencesOpen(false)

    if (previous?.analytics && !normalized.analytics) {
      denyGoogleAnalytics()
    }
  }, [])

  const openPreferences = useCallback(() => {
    setPreferencesOpen(true)
  }, [])

  const closePreferences = useCallback(() => {
    setPreferencesOpen(false)
  }, [])

  return (
    <CookieConsentContext.Provider
      value={{
        consent: hydrated ? consent : null,
        hasAnswered: hydrated && consent !== null,
        isReady: hydrated,
        preferencesOpen,
        setConsent,
        openPreferences,
        closePreferences,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext)
  if (!context) {
    throw new Error(
      'useCookieConsent must be used within a CookieConsentProvider'
    )
  }
  return context
}

export { DEFAULT_CONSENT }
