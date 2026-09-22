export function getSafeInternalPath(
  path: string | null | undefined,
  fallback: string
): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return fallback
  }
  return path
}

export function canUseBrowserBack(): boolean {
  if (typeof window === 'undefined') return false

  const historyIndex = window.history.state?.idx
  if (typeof historyIndex === 'number' && historyIndex > 0) {
    return true
  }

  if (document.referrer) {
    try {
      return new URL(document.referrer).origin === window.location.origin
    } catch {
      return false
    }
  }

  return false
}
