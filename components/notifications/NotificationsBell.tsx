'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
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

export function NotificationsBell() {
  const { supabase, session } = useSupabase()
  const userId = session?.user?.id

  const POLL_INTERVAL_MS = 60_000

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [shakeToken, setShakeToken] = useState(0)
  const lastUnreadRef = useRef(0)

  const hasUnread = unreadCount > 0
  const badgeText = useMemo(() => {
    if (!hasUnread) return null
    return unreadCount > 99 ? '99+' : String(unreadCount)
  }, [hasUnread, unreadCount])

  const triggerShake = useCallback(() => {
    setShakeToken(t => t + 1)
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
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

      const nextUnread = countRes.count ?? 0
      setUnreadCount(nextUnread)
      setItems((itemsRes.data as NotificationRow[]) || [])

      if (nextUnread > lastUnreadRef.current) triggerShake()
      lastUnreadRef.current = nextUnread
    } finally {
      setLoading(false)
    }
  }, [supabase, triggerShake, userId])

  useEffect(() => {
    if (!userId) return
    refresh()
  }, [refresh, userId])

  useEffect(() => {
    if (!userId) return

    const interval = window.setInterval(() => {
      // Avoid polling in background tabs.
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }
      void refresh()
    }, POLL_INTERVAL_MS)

    const onFocus = () => {
      void refresh()
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [POLL_INTERVAL_MS, refresh, userId])

  useEffect(() => {
    if (!open) return
    refresh()
  }, [open, refresh])

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return
      const now = new Date().toISOString()
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('user_id', userId)

      setItems(prev =>
        prev.map(n => (n.id === id ? { ...n, read_at: now } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    },
    [supabase, userId]
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const now = new Date().toISOString()
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null)

    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
    setUnreadCount(0)
  }, [supabase, userId])

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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
