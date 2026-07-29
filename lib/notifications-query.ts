import type { QueryClient } from '@tanstack/react-query'

export type NotificationRow = {
  id: string
  title: string
  body: string
  link_url: string | null
  created_at: string
  read_at: string | null
}

export function notificationsBellQueryKey(userId: string) {
  return ['notifications-bell', userId] as const
}

export function notificationsListQueryKey(userId: string) {
  return ['notifications-list', userId] as const
}

let suppressRealtimeUntilMs = 0

export function suppressNotificationsRealtime(ms = 1500) {
  suppressRealtimeUntilMs = Date.now() + ms
}

export function isNotificationsRealtimeSuppressed() {
  return Date.now() < suppressRealtimeUntilMs
}

export function invalidateNotifications(
  queryClient: QueryClient,
  userId: string
) {
  if (isNotificationsRealtimeSuppressed()) return

  void queryClient.invalidateQueries({
    queryKey: notificationsBellQueryKey(userId),
  })
  void queryClient.invalidateQueries({
    queryKey: notificationsListQueryKey(userId),
  })
}

type BellQueryData = {
  unreadCount: number
  items: NotificationRow[]
}

export function markNotificationReadInCache(
  queryClient: QueryClient,
  userId: string,
  id: string,
  readAt: string
) {
  suppressNotificationsRealtime()
  queryClient.setQueryData(
    notificationsBellQueryKey(userId),
    (prev: BellQueryData | undefined) => {
      if (!prev) return prev
      const wasUnread = prev.items.some(n => n.id === id && !n.read_at)
      return {
        unreadCount: wasUnread
          ? Math.max(0, prev.unreadCount - 1)
          : prev.unreadCount,
        items: prev.items.map(n =>
          n.id === id ? { ...n, read_at: n.read_at ?? readAt } : n
        ),
      }
    }
  )

  queryClient.setQueryData(
    notificationsListQueryKey(userId),
    (prev: NotificationRow[] | undefined) => {
      if (!prev) return prev
      return prev.map(n =>
        n.id === id ? { ...n, read_at: n.read_at ?? readAt } : n
      )
    }
  )
}

export function markAllNotificationsReadInCache(
  queryClient: QueryClient,
  userId: string,
  readAt: string
) {
  suppressNotificationsRealtime()
  queryClient.setQueryData(
    notificationsBellQueryKey(userId),
    (prev: BellQueryData | undefined) => {
      if (!prev) return prev
      return {
        unreadCount: 0,
        items: prev.items.map(n => ({ ...n, read_at: n.read_at ?? readAt })),
      }
    }
  )

  queryClient.setQueryData(
    notificationsListQueryKey(userId),
    (prev: NotificationRow[] | undefined) => {
      if (!prev) return prev
      return prev.map(n => ({ ...n, read_at: n.read_at ?? readAt }))
    }
  )
}
