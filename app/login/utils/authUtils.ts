import { SupabaseClient } from '@supabase/auth-helpers-nextjs'

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
    console.log(`Redirecting to saved location: ${savedRedirect}`)
    localStorage.removeItem('redirectAfterLogin')
    router.replace(savedRedirect)
    return
  }

  // Check for redirect in URL params
  const redirectTo = searchParams.get('redirectTo')
  if (redirectTo) {
    router.replace(redirectTo)
    return
  }

  // Default redirect to profile
  router.push('/profile')
}
