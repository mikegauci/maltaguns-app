'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type NotificationRow = {
  id: string
  title: string
  body: string
  link_url: string | null
  created_at: string
  read_at: string | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString()
}

export default function NotificationsPage() {
  const { supabase, session } = useSupabase()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<NotificationRow[]>([])

  const unreadCount = useMemo(
    () => items.filter(n => !n.read_at).length,
    [items]
  )

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id,title,body,link_url,created_at,read_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      setItems((data as NotificationRow[]) || [])
    } finally {
      setLoading(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    if (!userId) return
    refresh()
  }, [refresh, userId])

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
  }, [supabase, userId])

  if (!session?.user) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="p-6">
          <div className="text-lg font-semibold">Notifications</div>
          <div className="text-sm text-muted-foreground mt-2">
            Please{' '}
            <Link className="underline" href="/login">
              log in
            </Link>{' '}
            to view notifications.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <div className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${unreadCount} unread`}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={markAllRead}
          disabled={unreadCount === 0 || loading}
        >
          Mark all read
        </Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground text-center">
            No notifications yet.
          </Card>
        ) : (
          items.map(n => {
            const isUnread = !n.read_at
            const href = n.link_url || '/notifications'
            return (
              <Card key={n.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{n.title}</div>
                      {isUnread && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {n.body}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDate(n.created_at)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={href}>View</Link>
                    </Button>
                    {isUnread && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void markRead(n.id)}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
