'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

type UserRow = {
  id: string
  username: string
  email: string | null
  first_name: string | null
  last_name: string | null
  is_disabled: boolean | null
}

function displayName(u: UserRow): string {
  const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
  return name || u.username || u.email || u.id
}

export default function AdminNotificationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  const [sendToAll, setSendToAll] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserRow[]>([])
  const [selected, setSelected] = useState<Record<string, UserRow>>({})

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [isSending, setIsSending] = useState(false)

  const selectedCount = Object.keys(selected).length
  const titleRemaining = 100 - title.length
  const descRemaining = 100 - description.length

  const canSend = useMemo(() => {
    if (sendToAll)
      return title.trim().length > 0 && description.trim().length > 0
    return (
      selectedCount > 0 &&
      title.trim().length > 0 &&
      description.trim().length > 0
    )
  }, [description, selectedCount, sendToAll, title])

  // Auth gate
  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        if (!profile?.is_admin) {
          router.push('/admin')
          return
        }

        setIsAuthorized(true)
      } catch (e) {
        console.error('Admin auth error', e)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  const fetchUsers = useCallback(async () => {
    if (!isAuthorized) return
    if (sendToAll) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim().length > 0) params.set('q', query.trim())

      const res = await fetch(
        `/api/admin/notifications/users?${params.toString()}`
      )
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setResults((data.users as UserRow[]) || [])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to load users',
      })
    } finally {
      setLoading(false)
    }
  }, [isAuthorized, query, sendToAll, toast])

  // Search debounce
  useEffect(() => {
    if (!isAuthorized || sendToAll) return
    const t = window.setTimeout(() => void fetchUsers(), 250)
    return () => window.clearTimeout(t)
  }, [fetchUsers, isAuthorized, sendToAll])

  useEffect(() => {
    if (!isAuthorized) return
    void fetchUsers()
  }, [fetchUsers, isAuthorized])

  const toggleSelected = useCallback((u: UserRow, checked: boolean) => {
    setSelected(prev => {
      const next = { ...prev }
      if (checked) next[u.id] = u
      else delete next[u.id]
      return next
    })
  }, [])

  const clearSelected = useCallback(() => setSelected({}), [])

  const selectAllShown = useCallback(() => {
    setSelected(prev => {
      const next = { ...prev }
      results.forEach(u => {
        if (!u.is_disabled) next[u.id] = u
      })
      return next
    })
  }, [results])

  const handleSend = useCallback(async () => {
    if (!canSend) return

    setIsSending(true)
    try {
      const payload = {
        sendToAll,
        userIds: sendToAll ? [] : Object.keys(selected),
        title: title.trim(),
        description: description.trim(),
        linkUrl: linkUrl.trim() ? linkUrl.trim() : null,
      }

      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send notifications')

      toast({
        title: 'Sent',
        description: sendToAll
          ? 'Notification queued for all users.'
          : `Notification queued for ${data.sent} user(s).`,
      })

      setTitle('')
      setDescription('')
      setLinkUrl('')
      clearSelected()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send',
      })
    } finally {
      setIsSending(false)
    }
  }, [
    canSend,
    clearSelected,
    description,
    linkUrl,
    selected,
    sendToAll,
    title,
    toast,
  ])

  if (!isAuthorized) {
    return (
      <PageLayout>
        <PageHeader title="Notifications" description="Send notifications" />
        <BackButton label="Back to Dashboard" href="/admin" />
        <Card className="p-6 text-sm text-muted-foreground">
          Checking authorization…
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Notifications"
        description="Send manual notifications to all users or selected users"
      />
      <BackButton label="Back to Dashboard" href="/admin" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-semibold">Recipients</div>
              <div className="text-xs text-muted-foreground">
                {sendToAll
                  ? 'All users'
                  : selectedCount > 0
                    ? `${selectedCount} selected`
                    : 'Select users below'}
              </div>
            </div>
            {!sendToAll && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={selectAllShown}
                  disabled={results.length === 0}
                >
                  Select shown
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelected}
                  disabled={selectedCount === 0}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="send-to-all"
              checked={sendToAll}
              onCheckedChange={v => {
                const checked = Boolean(v)
                setSendToAll(checked)
                if (checked) clearSelected()
              }}
            />
            <Label htmlFor="send-to-all">Send to all users</Label>
          </div>

          {!sendToAll && (
            <>
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search users by username, name, or email…"
              />

              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  {loading ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      Loading…
                    </div>
                  ) : results.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No users found.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {results.map(u => {
                        const disabled = Boolean(u.is_disabled)
                        const checked = Boolean(selected[u.id])
                        return (
                          <div
                            key={u.id}
                            className="p-3 flex items-center gap-3"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={v =>
                                toggleSelected(u, Boolean(v))
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">
                                {displayName(u)}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {u.email ?? 'No email'}
                                {disabled ? ' • Disabled' : ''}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>

        <Card className="p-4 space-y-4">
          <div className="font-semibold">Message</div>

          <div className="space-y-2">
            <Label htmlFor="notif-title">Title (max 100)</Label>
            <Input
              id="notif-title"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 100))}
              placeholder="e.g. Site update"
            />
            <div className="text-xs text-muted-foreground">
              {titleRemaining} characters remaining
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-desc">Description (max 100)</Label>
            <Input
              id="notif-desc"
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 100))}
              placeholder="e.g. We’ve published new content."
            />
            <div className="text-xs text-muted-foreground">
              {descRemaining} characters remaining
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-link">Link (optional)</Label>
            <Input
              id="notif-link"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="e.g. https://maltaguns.com/blog"
            />
            <div className="text-xs text-muted-foreground">
              If provided, the notification will show a “View” link.
            </div>
          </div>

          <Button onClick={handleSend} disabled={!canSend || isSending}>
            {isSending ? 'Sending…' : 'Send notification'}
          </Button>

          <div className="text-xs text-muted-foreground">
            Emails are queued and will be sent by your cron job.
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}
