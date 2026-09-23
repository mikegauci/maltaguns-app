'use client'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAdminSecurityGate } from '@/hooks/useAdminSecurityGate'
import { Loader2 } from 'lucide-react'

export function AdminSecurityGate({ children }: { children: React.ReactNode }) {
  const { supabase, session } = useSupabase()
  const userId = session?.user?.id

  const { isSecurityReady, isCheckingSecurity } = useAdminSecurityGate(
    supabase,
    userId,
    Boolean(userId)
  )

  if (!userId || isCheckingSecurity || !isSecurityReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
