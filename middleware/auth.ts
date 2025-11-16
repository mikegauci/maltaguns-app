import type { SupabaseClient } from '@supabase/supabase-js'
import { withTimeout, isSessionNearExpiry } from './utils'
import { SESSION_TIMEOUT } from './config'

/**
 * Get and validate session with timeout
 */
export async function getValidSession(supabase: SupabaseClient) {
  try {
    const result = await withTimeout(
      supabase.auth.getSession(),
      SESSION_TIMEOUT
    )

    return result.data.session
  } catch (error) {
    console.error('Failed to get session:', error)
    // Clear stale session on timeout
    await supabase.auth.signOut()
    return null
  }
}

/**
 * Refresh session if near expiry
 */
export async function refreshSessionIfNeeded(
  supabase: SupabaseClient,
  expiresAt: number | undefined
) {
  if (!isSessionNearExpiry(expiresAt)) {
    return true
  }

  try {
    const result = await withTimeout(
      supabase.auth.refreshSession(),
      SESSION_TIMEOUT
    )

    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = result

    if (refreshError || !refreshedSession) {
      console.error('Session refresh failed:', refreshError)
      await supabase.auth.signOut()
      return false
    }

    // Set the refreshed session
    await supabase.auth.setSession({
      access_token: refreshedSession.access_token,
      refresh_token: refreshedSession.refresh_token,
    })

    return true
  } catch (error) {
    console.error('Error refreshing session:', error)
    await supabase.auth.signOut()
    return false
  }
}

