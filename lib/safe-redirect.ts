export function safeRedirectPath(
  value: string | null | undefined,
  fallback = '/profile'
): string {
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (value.includes('\\') || value.includes('\0')) return fallback
  return value
}
