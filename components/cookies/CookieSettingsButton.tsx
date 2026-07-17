'use client'

import { Button } from '@/components/ui/button'
import { useCookieConsent } from '@/components/providers/CookieConsentProvider'

export function CookieSettingsButton() {
  const { openPreferences } = useCookieConsent()

  return (
    <Button type="button" variant="outline" onClick={openPreferences}>
      Cookie settings
    </Button>
  )
}
