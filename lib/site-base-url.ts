const FALLBACK_ORIGIN = 'https://www.maltaguns.com'

export function getSiteBaseUrl(): string {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }

  const configured = (
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  )?.replace(/\/$/, '')

  if (configured) return configured

  return FALLBACK_ORIGIN
}
