export const COOKIE_CONSENT_KEY = 'maltaguns-cookie-consent'

export type CookieConsent = {
  essential: true
  analytics: boolean
}

export const DEFAULT_CONSENT: CookieConsent = {
  essential: true,
  analytics: false,
}

export function isCookieConsent(value: unknown): value is CookieConsent {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.essential === true && typeof record.analytics === 'boolean'
}

export function getConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isCookieConsent(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setConsent(consent: CookieConsent): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))
}

function isGoogleAnalyticsCookie(name: string): boolean {
  return (
    name === '_ga' ||
    name.startsWith('_ga_') ||
    name === '_gid' ||
    name === '_gat' ||
    name.startsWith('_gat_')
  )
}

/** Expire GA cookies on this host and parent domains (withdrawal). */
export function clearGoogleAnalyticsCookies(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  const hostname = window.location.hostname
  const domainParts = hostname.split('.')
  const domains = ['', hostname]

  for (let i = 0; i < domainParts.length - 1; i++) {
    domains.push(`.${domainParts.slice(i).join('.')}`)
  }

  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0]?.trim()
    if (!name || !isGoogleAnalyticsCookie(name)) return

    for (const domain of domains) {
      const domainAttr = domain ? `; domain=${domain}` : ''
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainAttr}`
    }
  })
}

export function denyGoogleAnalytics(): void {
  if (typeof window === 'undefined') return

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  }

  clearGoogleAnalyticsCookies()
}
