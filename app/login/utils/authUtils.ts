import type { SupabaseClient } from '@supabase/supabase-js'
import { safeRedirectPath } from '@/lib/safe-redirect'

/**
 * Check if a user's account is disabled
 */
export async function checkAccountDisabled(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('is_disabled')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    return false
  }

  return profileData?.is_disabled === true
}

/**
 * Check if an account is disabled by email
 */
export async function checkAccountDisabledByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('is_disabled')
    .eq('email', email)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    return false
  }

  return profileData?.is_disabled === true
}

/**
 * Resolve username to email address
 */
export async function resolveUsernameToEmail(
  supabase: SupabaseClient,
  identifier: string
): Promise<string> {
  const isEmail = identifier.includes('@')

  if (isEmail) {
    return identifier
  }

  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', identifier)
    .single()

  if (userError || !userData) {
    throw new Error('Username not found')
  }

  return userData.email
}

/**
 * Handle redirect after login
 */
export function handleLoginRedirect(
  router: any,
  searchParams: URLSearchParams
) {
  // Check for saved redirect location first
  const savedRedirect = localStorage.getItem('redirectAfterLogin')
  if (savedRedirect) {
    localStorage.removeItem('redirectAfterLogin')
    router.replace(safeRedirectPath(savedRedirect))
    return
  }

  const redirectTo = searchParams.get('redirectTo')
  if (redirectTo) {
    router.replace(safeRedirectPath(redirectTo))
    return
  }

  // Default redirect to profile
  router.push('/profile')
}
