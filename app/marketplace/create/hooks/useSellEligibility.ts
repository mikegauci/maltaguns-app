'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  clearSellEligibilityCache,
  readSellEligibilityCache,
  writeSellEligibilityCache,
  type CachedSellEligibility,
} from '@/lib/sell-eligibility-cache'

export type SellEligibilitySnapshot = {
  isLoading: boolean
  isSeller: boolean
  isVerified: boolean
  isIdentityVerified: boolean
  hasLicense: boolean
  userId: string | null
  isRetailer: boolean
  credits: number
}

const defaultSnapshot: SellEligibilitySnapshot = {
  isLoading: true,
  isSeller: false,
  isVerified: false,
  isIdentityVerified: false,
  hasLicense: false,
  userId: null,
  isRetailer: false,
  credits: 0,
}

let snapshot: SellEligibilitySnapshot = { ...defaultSnapshot }
let inflight: Promise<SellEligibilitySnapshot> | null = null
let cacheHydrated = false
let authListenerRegistered = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

function getServerSnapshot() {
  return defaultSnapshot
}

function resetSnapshot() {
  inflight = null
  snapshot = { ...defaultSnapshot }
  emit()
}

export { clearSellEligibilityCache }

async function loadSellEligibility(
  router: ReturnType<typeof useRouter>
): Promise<SellEligibilitySnapshot> {
  const supabase = createClient()

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  if (authError) {
    console.error('Auth error:', authError)
    router.push('/login')
    throw authError
  }

  if (!session) {
    router.push('/login')
    throw new Error('No session found')
  }

  const sessionExpiry = new Date(session.expires_at! * 1000)
  const now = new Date()
  const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
  const isNearExpiry = timeUntilExpiry < 5 * 60 * 1000

  if (isNearExpiry) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession()

    if (refreshError || !refreshedSession) {
      console.error('Session refresh failed:', refreshError)
      router.push('/login')
      throw refreshError ?? new Error('Session refresh failed')
    }
  }

  const userId = session.user.id

  const [
    { data: profile, error: profileError },
    { data: retailerData },
    { data: creditsData },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_seller, is_verified, identity_verified, license_image')
      .eq('id', userId)
      .single(),
    supabase.from('stores').select('id').eq('owner_id', userId).limit(1),
    supabase.from('credits').select('amount').eq('user_id', userId).single(),
  ])

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    throw profileError
  }

  const cached: CachedSellEligibility = {
    userId,
    isSeller: profile?.is_seller ?? false,
    isVerified: profile?.is_verified ?? false,
    isIdentityVerified: profile?.identity_verified ?? false,
    hasLicense: !!profile?.license_image,
    isRetailer: !!retailerData?.[0],
    credits: creditsData?.amount ?? 0,
  }

  writeSellEligibilityCache(cached)

  return {
    isLoading: false,
    ...cached,
  }
}

function fetchSellEligibility(
  router: ReturnType<typeof useRouter>,
  force = false
): Promise<SellEligibilitySnapshot> {
  if (inflight) {
    if (!force) return inflight
    return inflight
      .catch(() => {})
      .then(() => fetchSellEligibility(router, true))
  }

  const promise = loadSellEligibility(router)
    .then(next => {
      snapshot = next
      emit()
      return next
    })
    .catch(error => {
      snapshot = { ...snapshot, isLoading: false }
      emit()
      throw error
    })
    .finally(() => {
      if (inflight === promise) {
        inflight = null
      }
    })

  inflight = promise
  return promise
}

async function hydrateFromCacheOnce() {
  if (cacheHydrated || typeof window === 'undefined') return
  cacheHydrated = true

  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user.id ?? null
  const cached = readSellEligibilityCache(userId)

  if (cached) {
    snapshot = { ...defaultSnapshot, ...cached, isLoading: false }
    emit()
  }
}

function registerAuthListener(router: ReturnType<typeof useRouter>) {
  if (authListenerRegistered || typeof window === 'undefined') return
  authListenerRegistered = true

  const supabase = createClient()
  supabase.auth.onAuthStateChange((event, session) => {
    const nextUserId = session?.user.id ?? null

    if (event === 'SIGNED_OUT' || !nextUserId) {
      clearSellEligibilityCache()
      resetSnapshot()
      return
    }

    if (snapshot.userId && snapshot.userId !== nextUserId) {
      clearSellEligibilityCache()
      resetSnapshot()
      fetchSellEligibility(router, true).catch(() => {})
    }
  })
}

export function useSellEligibility() {
  const router = useRouter()
  const eligibility = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  useEffect(() => {
    registerAuthListener(router)
    hydrateFromCacheOnce().then(() => {
      fetchSellEligibility(router).catch(() => {})
    })
  }, [router])

  const refreshEligibility = useCallback(
    () => fetchSellEligibility(router, true),
    [router]
  )

  return {
    ...eligibility,
    refreshEligibility,
  }
}
