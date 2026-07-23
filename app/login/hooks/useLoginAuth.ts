import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SupabaseClient } from '@supabase/auth-helpers-nextjs'
import { forceLogout } from '@/lib/auth-utils'
import { checkAccountDisabled, handleLoginRedirect } from '../utils/authUtils'

export function useLoginAuth(supabase: SupabaseClient) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isDisabled, setIsDisabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for error in URL params on mount
  useEffect(() => {
    const errorMsg = searchParams.get('error')
    if (errorMsg) {
      setError(errorMsg)

      if (errorMsg.includes('disabled')) {
        setIsDisabled(true)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('supabase.auth.token')
          forceLogout()
        }
      }
    }
  }, [searchParams])

  // Check session and authentication state
  useEffect(() => {
    let mounted = true

    async function checkSession() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          return
        }

        if (!session) {
          return
        }

        // Check if account is disabled
        const disabled = await checkAccountDisabled(supabase, session.user.id)

        if (disabled) {
          setIsDisabled(true)
          setError('Your account has been disabled by an administrator')
          return
        }

        // Not disabled, proceed with authenticated flow
        if (mounted) {
          setIsAuthenticated(true)
          setUserEmail(session.user.email || null)
          handleLoginRedirect(router, searchParams)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      }
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [supabase, router, searchParams])

  return {
    isAuthenticated,
    userEmail,
    isDisabled,
    error,
    setError,
    setIsDisabled,
  }
}
