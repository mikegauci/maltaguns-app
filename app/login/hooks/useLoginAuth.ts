import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { forceLogout } from '@/lib/auth-utils'
import { checkAccountDisabled, handleLoginRedirect } from '../utils/authUtils'

export function useLoginAuth(supabase: SupabaseClient) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const urlError = searchParams.get('error')
  const [manualError, setError] = useState<string | null>(null)
  const error = manualError ?? urlError
  const [manualDisabled, setIsDisabled] = useState(false)
  const isDisabledFromUrl = Boolean(urlError?.includes('disabled'))
  const isDisabled = manualDisabled || isDisabledFromUrl

  useEffect(() => {
    if (!isDisabledFromUrl) return
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token')
      void forceLogout()
    }
  }, [isDisabledFromUrl])

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
