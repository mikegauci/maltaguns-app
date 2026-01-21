'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NotificationRow = {
  id: string
  title: string
  body: string
  link_url: string | null
  created_at: string
  read_at: string | null
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function isDocumentVisible() {
  return (
    typeof document === 'undefined' || document.visibilityState === 'visible'
  )
}

export function NotificationsBell() {
  const { supabase, session } = useSupabase()
  const userId = session?.user?.id

  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const [shakeToken, setShakeToken] = useState(0)
  const lastUnreadRef = useRef(0)
  const inFlightMutationRef = useRef(false)

  const notificationsQuery = useQuery({
    queryKey: ['notifications-bell', userId],
    enabled: !!userId,
    // Fetch once per session; refresh only when we explicitly invalidate (Realtime INSERT / mark read).
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (!userId) return { unreadCount: 0, items: [] as NotificationRow[] }
      const [countRes, itemsRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('read_at', null),
        supabase
          .from('notifications')
          .select('id,title,body,link_url,created_at,read_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      return {
        unreadCount: countRes.count ?? 0,
        items: ((itemsRes.data as NotificationRow[]) ||
          []) as NotificationRow[],
      }
    },
  })

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0
  const items = notificationsQuery.data?.items ?? []
  const loading = notificationsQuery.isFetching || inFlightMutationRef.current

  const hasUnread = unreadCount > 0
  const badgeText = useMemo(() => {
    if (!hasUnread) return null
    return unreadCount > 99 ? '99+' : String(unreadCount)
  }, [hasUnread, unreadCount])

  const triggerShake = useCallback(() => {
    setShakeToken(t => t + 1)
  }, [])

  // Shake only when unread increases (new notifications), not on every render/navigation.
  useEffect(() => {
    if (unreadCount > lastUnreadRef.current) triggerShake()
    lastUnreadRef.current = unreadCount
  }, [triggerShake, unreadCount])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (!isDocumentVisible()) return
          void queryClient.invalidateQueries({
            queryKey: ['notifications-bell', userId],
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (!isDocumentVisible()) return
          void queryClient.invalidateQueries({
            queryKey: ['notifications-bell', userId],
          })
        }
      )
      .subscribe()

    const onVisibilityChange = () => {
      if (!isDocumentVisible()) return
      void queryClient.invalidateQueries({
        queryKey: ['notifications-bell', userId],
      })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void supabase.removeChannel(channel)
    }
  }, [queryClient, supabase, triggerShake, userId])

  // No "refetch on open" — the dropdown should not cause network traffic by itself.

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return
      inFlightMutationRef.current = true
      const now = new Date().toISOString()
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('user_id', userId)
      inFlightMutationRef.current = false

      void queryClient.invalidateQueries({
        queryKey: ['notifications-bell', userId],
      })
    },
    [queryClient, supabase, userId]
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    inFlightMutationRef.current = true
    const now = new Date().toISOString()
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null)
    inFlightMutationRef.current = false

    void queryClient.invalidateQueries({
      queryKey: ['notifications-bell', userId],
    })
  }, [queryClient, supabase, userId])

  if (!userId) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative aspect-square rounded-full w-10 flex items-center justify-center bg-background focus:outline-none p-2 border"
        >
          <Bell
            key={shakeToken}
            className={`h-5 w-5 ${hasUnread ? 'animate-bell-shake' : ''}`}
          />
          {badgeText && (
            <span className="absolute -top-1 -right-1 w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] leading-4 text-center">
              {badgeText}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-2 mt-2" align="end">
        <div className="px-2 py-1 flex items-center justify-between">
          <div className="text-sm font-medium">Notifications</div>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasUnread || loading}
            onClick={markAllRead}
            className="h-8"
          >
            Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator />

        <div className="md:max-h-[350px] max-h-[250px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-2 py-6 text-sm text-muted-foreground text-center">
              {loading ? 'Loading…' : 'No notifications yet.'}
            </div>
          ) : (
            <>
              {items.map(n => {
                const href = n.link_url || '/notifications'
                const isUnread = !n.read_at
                return (
                  <DropdownMenuItem key={n.id} className="cursor-pointer p-0">
                    <div className="w-full px-2 py-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium truncate">
                              {n.title}
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0">
                              {formatRelativeTime(n.created_at)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.body}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Link
                              href={href}
                              className="text-xs underline"
                              onClick={() => {
                                if (isUnread) void markRead(n.id)
                              }}
                            >
                              View
                            </Link>
                            {isUnread && (
                              <button
                                className="text-xs underline text-muted-foreground"
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  void markRead(n.id)
                                }}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                        {isUnread && (
                          <span className="mt-1 w-2 h-2 rounded-full bg-destructive shrink-0" />
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
