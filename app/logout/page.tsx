'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function logout() {
      await supabase.auth.signOut()
      router.push('/login')
    }
    logout()
  }, [supabase, router])

  return <div>Logging out...</div>
} 