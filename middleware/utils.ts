import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Create a timeout promise that cleans up properly
 */
export function createTimeoutPromise(ms: number): {
  promise: Promise<never>
  cleanup: () => void
} {
  let timeoutId: NodeJS.Timeout

  const promise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`))
    }, ms)
  })

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  return { promise, cleanup }
}

/**
 * Execute a promise with timeout and proper cleanup
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  const { promise: timeoutPromise, cleanup } = createTimeoutPromise(ms)

  try {
    const result = await Promise.race([promise, timeoutPromise])
    cleanup()
    return result
  } catch (error) {
    cleanup()
    throw error
  }
}

/**
 * Check if session is near expiry
 */
export function isSessionNearExpiry(
  expiresAt: number | undefined,
  thresholdMinutes: number = 5
): boolean {
  if (!expiresAt) return true

  const sessionExpiry = new Date(expiresAt * 1000)
  const now = new Date()
  const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
  const threshold = thresholdMinutes * 60 * 1000

  return timeUntilExpiry < threshold
}

/**
 * Fetch user profile with admin and disabled status
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ is_admin: boolean; is_disabled: boolean } | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, is_disabled')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return profile
}

/**
 * Helper function to handle login redirects
 */
export function redirectToLogin(
  req: NextRequest,
  errorMessage?: string
): NextResponse {
  const redirectUrl = new URL('/login', req.url)
  redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)

  if (errorMessage) {
    redirectUrl.searchParams.set('error', errorMessage)
  }

  const response = NextResponse.redirect(redirectUrl)
  response.headers.set('Cache-Control', 'no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')

  return response
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store, must-revalidate')
  res.headers.set('Pragma', 'no-cache')
  return res
}

/**
 * Check if route is protected
 */
export function isProtectedRoute(
  pathname: string,
  routes: readonly string[]
): boolean {
  return routes.some(route => pathname.startsWith(route))
}

