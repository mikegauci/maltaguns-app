'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdminSecurityGate } from '@/hooks/useAdminSecurityGate'
import { Loader2 } from 'lucide-react'

export function AdminSecurityGate({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [userId, setUserId] = useState<string>()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!mounted) return

      setUserId(user?.id)
      setAuthChecked(true)
    }

    void loadUser()

    return () => {
      mounted = false
    }
  }, [supabase])

  const { isSecurityReady, isCheckingSecurity } = useAdminSecurityGate(
    supabase,
    userId,
    authChecked && Boolean(userId)
  )

  if (!authChecked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isCheckingSecurity || !isSecurityReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
