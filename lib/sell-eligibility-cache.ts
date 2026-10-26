export const SELL_ELIGIBILITY_CACHE_KEY = 'maltaguns:sell-eligibility'

export type CachedSellEligibility = {
  userId: string
  isSeller: boolean
  isVerified: boolean
  isIdentityVerified: boolean
  hasLicense: boolean
  isRetailer: boolean
  credits: number
}

export function clearSellEligibilityCache() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SELL_ELIGIBILITY_CACHE_KEY)
  } catch {}
}

export function readSellEligibilityCache(
  userId: string | null
): CachedSellEligibility | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = sessionStorage.getItem(SELL_ELIGIBILITY_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedSellEligibility
    if (parsed.userId !== userId) {
      clearSellEligibilityCache()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeSellEligibilityCache(snapshot: CachedSellEligibility) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SELL_ELIGIBILITY_CACHE_KEY, JSON.stringify(snapshot))
  } catch {}
}
