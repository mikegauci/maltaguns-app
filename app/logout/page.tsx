'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useEffect } from 'react'
import { forceLogout } from '@/lib/auth-utils'

export default function LogoutPage() {
  const { supabase } = useSupabase()

  useEffect(() => {
    async function logout() {
      try {
        // Try standard logout first
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Error during standard logout:', error)
      } finally {
        await forceLogout()
      }
    }
    logout()
  }, [supabase])

  return <div>Logging out...</div>
}
