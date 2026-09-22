import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveUsernameToEmail,
  checkAccountDisabledByEmail,
} from '../utils/authUtils'

interface LoginHandlerParams {
  identifier: string
  password: string
  supabase: SupabaseClient
  router: any
  setIsDisabled: (disabled: boolean) => void
}

/**
 * Handle login form submission
 */
export async function handleLogin({
  identifier,
  password,
  supabase,
  router,
  setIsDisabled,
}: LoginHandlerParams): Promise<void> {
  // Resolve username to email
  const email = await resolveUsernameToEmail(supabase, identifier)

  // Check if account is disabled before attempting login
  const disabled = await checkAccountDisabledByEmail(supabase, email)

  if (disabled) {
    setIsDisabled(true)
    throw new Error('Your account has been disabled by an administrator')
  }

  // Attempt sign in
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('disabled')) {
      setIsDisabled(true)
    }
    throw error
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const redirectUrl = localStorage.getItem('redirectAfterLogin')
  const destination =
    redirectUrl && redirectUrl.startsWith('/admin') ? redirectUrl : null

  if (redirectUrl) {
    localStorage.removeItem('redirectAfterLogin')
  }

  if (destination && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profile?.is_admin) {
      router.push(destination)
      router.refresh()
      return
    }
  }

  if (redirectUrl) {
    router.push(redirectUrl)
  } else {
    router.push('/profile')
  }

  router.refresh()
}

interface ResetPasswordHandlerParams {
  email: string
  supabase: SupabaseClient
  toast: any
  onSuccess: () => void
}

/**
 * Handle password reset request
 */
export async function handlePasswordReset({
  email,
  supabase,
  toast,
  onSuccess,
}: ResetPasswordHandlerParams): Promise<void> {
  const redirectTo = `${window.location.origin}/reset-password`
  console.log(`Setting password reset redirect to: ${redirectTo}`)

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) throw error

  toast({
    title: 'Password reset email sent',
    description: 'Check your email for a link to reset your password.',
  })

  onSuccess()
}
