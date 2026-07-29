'use client'

import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useSupabase } from '@/components/providers/SupabaseProvider'

type NotificationChange = {
  read_at?: string | null
}

function isDocumentVisible() {
  return (
    typeof document === 'undefined' || document.visibilityState === 'visible'
  )
}

function shouldRefreshOnUpdate(
  payload: RealtimePostgresChangesPayload<NotificationChange>
) {
  const oldRow = payload.old as NotificationChange | undefined
  const newRow = payload.new as NotificationChange | undefined
  const oldReadAt = oldRow?.read_at ?? null
  const newReadAt = newRow?.read_at ?? null
  return oldReadAt !== newReadAt
}

export function useNotificationsRealtime(
  userId: string | undefined,
  onChange: () => void,
  channelKey = 'default'
) {
  const { supabase } = useSupabase()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!userId) return

    const refresh = () => {
      if (!isDocumentVisible()) return
      onChangeRef.current()
    }

    const channel = supabase
      .channel(`notifications:${channelKey}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        refresh
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationChange>) => {
          if (!shouldRefreshOnUpdate(payload)) return
          refresh()
        }
      )
      .subscribe()

    const onVisibilityChange = () => {
      if (!isDocumentVisible()) return
      onChangeRef.current()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void supabase.removeChannel(channel)
    }
  }, [supabase, userId, channelKey])
}
