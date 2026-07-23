'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { forceLogout } from '@/lib/auth-utils'

export default function LogoutPage() {
  const supabase = createClient()

  useEffect(() => {
    async function logout() {
      try {
        // Try standard logout first
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Error during standard logout:', error)
      } finally {
        // Always perform force logout to ensure clean state
        forceLogout()
      }
    }
    logout()
  }, [supabase])

  return <div>Logging out...</div>
}
