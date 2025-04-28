'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { forceLogout } from '@/lib/auth-utils'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

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