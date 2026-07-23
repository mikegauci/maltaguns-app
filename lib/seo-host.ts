const CANONICAL_ORIGIN = 'https://www.maltaguns.com'

export function isNonProductionHost(host: string | null | undefined): boolean {
  if (!host) return false
  const hostname = host.split(':')[0].toLowerCase()
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app')
  )
}

function normalizeAppUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (isNonProductionHost(parsed.hostname)) {
      return null
    }
    if (parsed.hostname === 'maltaguns.com') {
      parsed.hostname = 'www.maltaguns.com'
    }
    return parsed.origin
  } catch {
    return null
  }
}

export function getAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .map(value => value.replace(/\/$/, ''))

  for (const url of candidates) {
    const normalized = normalizeAppUrl(url)
    if (normalized) return normalized
  }

  return CANONICAL_ORIGIN
}

export function toAbsoluteUrl(url: string, appUrl = getAppUrl()): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('//')) {
    return `https:${url}`
  }
  return `${appUrl}${url.startsWith('/') ? url : `/${url}`}`
}
