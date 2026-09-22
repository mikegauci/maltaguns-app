'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getAdminSecurityStatus,
  getRequiredAdminSecurityRedirect,
} from '@/lib/admin-security'

export function useAdminSecurityGate(
  supabase: SupabaseClient,
  userId: string | undefined,
  enabled: boolean
) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSecurityReady, setIsSecurityReady] = useState(false)
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(enabled)

  useEffect(() => {
    if (!enabled || !userId) {
      return
    }

    let mounted = true

    async function checkSecurity() {
      setIsCheckingSecurity(true)
      setIsSecurityReady(false)

      try {
        const status = await getAdminSecurityStatus(supabase, userId!)
        const redirectTo = getRequiredAdminSecurityRedirect(status, pathname)

        if (redirectTo && redirectTo !== pathname) {
          router.replace(redirectTo)
          return
        }

        if (mounted) {
          setIsSecurityReady(true)
        }
      } catch (error) {
        console.error('Admin security gate error:', error)
        router.push('/login')
      } finally {
        if (mounted) {
          setIsCheckingSecurity(false)
        }
      }
    }

    void checkSecurity()

    return () => {
      mounted = false
    }
  }, [enabled, userId, pathname, router, supabase])

  if (!enabled) {
    return { isSecurityReady: false, isCheckingSecurity: false }
  }

  return { isSecurityReady, isCheckingSecurity }
}
