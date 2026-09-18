const hits = new Map<string, number[]>()

export function isContactFormRateLimited(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter(
    timestamp => now - timestamp < windowMs
  )

  if (recent.length >= limit) {
    hits.set(key, recent)
    return true
  }

  recent.push(now)
  hits.set(key, recent)
  return false
}
