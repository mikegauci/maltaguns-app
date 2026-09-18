'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { AdminDataTable as DataTable } from '@/app/admin/components/AdminDataTable'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { AdminEmptyState } from '@/app/admin/components/AdminEmptyState'
import { AdminDataCount } from '@/app/admin/components/AdminDataCount'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { useToast } from '@/hooks/use-toast'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import type { AdminIdentityReviewSessionItem } from '@/lib/didit-admin-types'

const PAGE_LIMIT = 50

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'In Review', label: 'In Review' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Declined', label: 'Declined' },
  { value: 'Resubmitted', label: 'Resubmitted' },
] as const

export default IdentityReviewsPageComponent

function parseIdentityStatusFilter(
  value: string | null
): (typeof STATUS_FILTERS)[number]['value'] {
  if (value === 'in-review') {
    return 'In Review'
  }

  return STATUS_FILTERS.find(filter => filter.value === value)?.value ?? 'all'
}

function IdentityReviewsPageComponent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isAuthorized, isChecking: isCheckingAdmin } = useRequireAdmin({
    preset: 'home-toast',
  })
  const [sessions, setSessions] = useState<AdminIdentityReviewSessionItem[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<
    (typeof STATUS_FILTERS)[number]['value']
  >(() => parseIdentityStatusFilter(searchParams.get('status')))
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchSessions = useCallback(
    async (append = false, offset = 0) => {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const params = new URLSearchParams()
        if (statusFilter !== 'all') {
          params.set('status', statusFilter)
        }
        params.set('limit', String(PAGE_LIMIT))
        params.set('offset', String(offset))

        const response = await fetch(
          `/api/admin/identity-reviews?${params.toString()}`
        )
        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(result.error || 'Failed to load identity reviews')
        }

        const result = await response.json()
        const nextSessions = result.sessions ?? []

        setSessions(current =>
          append ? [...current, ...nextSessions] : nextSessions
        )
        setPendingCount(result.pendingCount ?? 0)
        setHasMore(Boolean(result.hasMore))
        setTotalCount(
          typeof result.totalCount === 'number' ? result.totalCount : null
        )
      } catch (error) {
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to load identity reviews',
          variant: 'destructive',
        })
      } finally {
        if (append) {
          setIsLoadingMore(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [statusFilter, toast]
  )

  useEffect(() => {
    if (!isAuthorized) return

    scheduleEffectWork(() => {
      void fetchSessions(false, 0)
    })
  }, [fetchSessions, isAuthorized])

  function handleLoadMore() {
    void fetchSessions(true, sessions.length)
  }

  const columns: ColumnDef<AdminIdentityReviewSessionItem>[] = [
    {
      accessorKey: 'sessionNumber',
      header: 'Session',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            #{row.original.sessionNumber ?? '—'}
          </span>
          {row.original.isCurrentSession ? (
            <span className="text-xs text-muted-foreground">Current</span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'idFront',
      header: 'ID front',
      cell: ({ row }) => <IdFrontThumbnail session={row.original} />,
    },
    {
      accessorKey: 'fullName',
      header: 'User',
      cell: ({ row }) => {
        const session = row.original

        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">
              {session.fullName || session.username || 'Unknown user'}
            </span>
            {session.username ? (
              <span className="text-xs text-muted-foreground">
                @{session.username}
              </span>
            ) : null}
            {session.email ? (
              <span className="text-xs text-muted-foreground">
                {session.email}
              </span>
            ) : null}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'documentType',
      header: 'Document',
      cell: ({ row }) => {
        const session = row.original
        if (!session.documentType && !session.country) return '—'
        return [session.country, session.documentType]
          .filter(Boolean)
          .join(' · ')
      },
    },
    {
      accessorKey: 'lastWarning',
      header: 'Last warning',
      cell: ({ row }) =>
        row.original.lastWarning
          ? row.original.lastWarning.replace(/_/g, ' ')
          : '—',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        const value = row.original.createdAt
        return value ? format(new Date(value), 'PPp') : '—'
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const session = row.original
        if (!session.userId) {
          return (
            <span className="text-xs text-muted-foreground">No profile</span>
          )
        }

        const href = `/admin/identity-reviews/${session.userId}?sessionId=${session.sessionId}`

        return (
          <Button
            asChild
            size="sm"
            variant={session.status === 'In Review' ? 'default' : 'outline'}
          >
            <Link href={href}>
              {session.status === 'In Review' ? 'Review' : 'View'}
            </Link>
          </Button>
        )
      },
    },
  ]

  if (isCheckingAdmin || isLoading) {
    return <AdminLoadingState message="Loading Didit sessions..." />
  }

  return (
    <AdminPageLayout
      title="Identity Reviews"
      description="Review Didit identity verifications from MaltaGuns. View ID photos, document details, and submit approve, decline, or resubmission decisions."
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_FILTERS.map(filter => (
          <Button
            key={filter.value}
            size="sm"
            variant={statusFilter === filter.value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
            {filter.value === 'In Review' && pendingCount > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {pendingCount}
              </Badge>
            ) : null}
          </Button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <AdminEmptyState message="No Didit verification sessions found." />
      ) : (
        <>
          <AdminDataCount
            count={sessions.length}
            singularLabel="session"
            pluralLabel="sessions"
            emptyMessage="No Didit verification sessions found."
          />
          {totalCount != null && totalCount > sessions.length ? (
            <p className="text-sm text-muted-foreground -mt-4 mb-6">
              Loaded {sessions.length} of {totalCount} sessions from Didit.
            </p>
          ) : null}
          <DataTable
            columns={columns}
            data={sessions}
            searchKeys={[
              'fullName',
              'username',
              'email',
              'documentType',
              'status',
              'lastWarning',
              'country',
            ]}
            searchPlaceholder="Search sessions..."
          />
          {hasMore ? (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load more sessions'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </AdminPageLayout>
  )
}

function IdFrontThumbnail({
  session,
}: {
  session: AdminIdentityReviewSessionItem
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [failed, setFailed] = useState(false)
  const src = `/api/admin/identity-reviews/sessions/${session.sessionId}/media?kind=front`

  useEffect(() => {
    const element = containerRef.current
    if (!element || shouldLoad) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '120px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [shouldLoad])

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    event.currentTarget.style.display = 'none'
    setFailed(true)
  }

  const placeholder = (
    <div className="h-12 w-20 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
      {failed ? '—' : null}
    </div>
  )

  const image =
    shouldLoad && !failed ? (
      <img
        src={src}
        alt="ID front"
        className="h-12 w-20 object-cover rounded border bg-muted"
        onError={handleError}
      />
    ) : (
      placeholder
    )

  if (!session.userId) {
    return <div ref={containerRef}>{image}</div>
  }

  return (
    <div ref={containerRef}>
      <Link
        href={`/admin/identity-reviews/${session.userId}?sessionId=${session.sessionId}`}
        className="block hover:opacity-90 transition-opacity"
      >
        {image}
      </Link>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'Approved'
      ? 'bg-green-100 text-green-800 border-green-200'
      : status === 'Declined'
        ? 'bg-red-100 text-red-800 border-red-200'
        : status === 'In Review'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-muted text-muted-foreground'

  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  )
}
