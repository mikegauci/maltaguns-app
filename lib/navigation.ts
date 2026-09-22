const ALLOWED_RETURN_TO_PREFIXES = ['/profile/armory', '/marketplace']

export function getSafeInternalPath(
  path: string | null | undefined,
  fallback: string
): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return fallback
  }

  if (/[\\:@]/.test(path)) {
    return fallback
  }

  const pathname = path.split('?')[0] ?? path
  const isAllowed = ALLOWED_RETURN_TO_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (!isAllowed) {
    return fallback
  }

  return path
}
