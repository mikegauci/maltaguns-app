'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime'
import {
  invalidateNotifications,
  markAllNotificationsReadInCache,
  markNotificationReadInCache,
  notificationsListQueryKey,
  type NotificationRow,
} from '@/lib/notifications-query'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString()
}

export default function NotificationsPage() {
  const { supabase, session } = useSupabase()
  const userId = session?.user?.id
  const queryClient = useQueryClient()

  const refreshNotifications = useCallback(() => {
    if (!userId) return
    invalidateNotifications(queryClient, userId)
  }, [queryClient, userId])

  useNotificationsRealtime(userId, refreshNotifications, 'page')

  const notificationsQuery = useQuery({
    queryKey: userId
      ? notificationsListQueryKey(userId)
      : ['notifications-list'],
    enabled: !!userId,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (!userId) return [] as NotificationRow[]
      const { data } = await supabase
        .from('notifications')
        .select('id,title,body,link_url,created_at,read_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      return (data as NotificationRow[]) || []
    },
  })

  const items = notificationsQuery.data ?? []
  const loading = notificationsQuery.isFetching

  const unreadCount = useMemo(
    () => items.filter(n => !n.read_at).length,
    [items]
  )

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return
      const now = new Date().toISOString()
      markNotificationReadInCache(queryClient, userId, id, now)
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('user_id', userId)
    },
    [queryClient, supabase, userId]
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const now = new Date().toISOString()
    markAllNotificationsReadInCache(queryClient, userId, now)
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null)
  }, [queryClient, supabase, userId])

  if (!session?.user) {
    return (
      <PageLayout>
        <Card className="rounded-sm border-border p-6 shadow-none">
          <div className="text-lg font-semibold">Notifications</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Please{' '}
            <Link className="underline" href="/login">
              log in
            </Link>{' '}
            to view notifications.
          </div>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Notifications"
        description={
          loading
            ? 'Loading…'
            : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
        }
        actions={
          <Button
            variant="outline"
            className="rounded-sm"
            onClick={markAllRead}
            disabled={unreadCount === 0 || loading}
          >
            Mark all read
          </Button>
        }
      />

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card className="rounded-sm border-border p-6 text-center text-sm text-muted-foreground shadow-none">
            No notifications yet.
          </Card>
        ) : (
          items.map(n => {
            const isUnread = !n.read_at
            const href = n.link_url || '/notifications'
            return (
              <Card
                key={n.id}
                className="rounded-sm border-border p-4 shadow-none"
              >
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
                    <div className="text-sm text-foreground/80 mt-1">
                      {n.body}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 tabular-nums">
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
    </PageLayout>
  )
}
