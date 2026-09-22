'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DEFAULT_CONSENT,
  useCookieConsent,
} from '@/components/providers/CookieConsentProvider'

export function CookieBanner() {
  const {
    hasAnswered,
    isReady,
    preferencesOpen,
    setConsent,
    closePreferences,
  } = useCookieConsent()

  const showBanner = isReady && (!hasAnswered || preferencesOpen)

  if (!showBanner) {
    return null
  }

  const acceptAll = () => {
    setConsent({ essential: true, analytics: true })
  }

  const rejectNonEssential = () => {
    setConsent({ ...DEFAULT_CONSENT })
  }

  return (
    <div
      role="region"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="site-chrome fixed inset-x-0 bottom-0 z-50 border-t border-[var(--chrome-border)] bg-[var(--chrome-bg)] p-4 shadow-lg sm:p-6"
    >
      <div className="container mx-auto max-w-5xl space-y-3 text-center md:text-left">
        <h2
          id="cookie-consent-title"
          className="text-lg font-semibold text-[var(--chrome-ink)]"
        >
          Cookie preferences
        </h2>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
          <p
            id="cookie-consent-description"
            className="text-sm text-[var(--chrome-muted)] md:min-w-0 md:flex-1"
          >
            We use essential cookies to run the site (sign-in and checkout).
            With your permission, we also use Google Analytics to understand how
            the site is used. Read more in our{' '}
            <Link
              href="/cookie-policy"
              className="underline text-[var(--chrome-ink)] hover:text-[var(--chrome-brand)] transition-colors"
            >
              Cookie Policy
            </Link>
            .
          </p>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:justify-center md:w-auto md:justify-end">
            {preferencesOpen && hasAnswered && (
              <Button
                variant="outline"
                onClick={closePreferences}
                className="rounded-sm border-[var(--chrome-border)] bg-[var(--chrome-surface)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-slate)] hover:text-[var(--chrome-ink)]"
              >
                Cancel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={rejectNonEssential}
              className="rounded-sm border-[var(--chrome-border)] bg-[var(--chrome-surface)] text-[var(--chrome-ink)] hover:bg-[var(--chrome-slate)] hover:text-[var(--chrome-ink)]"
            >
              Reject non-essential
            </Button>
            <Button
              onClick={acceptAll}
              className="rounded-sm bg-[var(--chrome-brand)] text-white hover:bg-[var(--chrome-brand)]/90"
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
