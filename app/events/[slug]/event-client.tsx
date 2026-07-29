'use client'

import {
  useState,
  useEffect,
  Suspense,
  startTransition,
  type ReactNode,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Mail,
  Phone,
  Coins,
  Pencil,
  Maximize2,
  CheckCircle,
  X,
  User,
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/public'
import { BackButton } from '@/components/ui/back-button'
import { PageLayout } from '@/components/ui/page-layout'
import { StorageImage } from '@/components/ui/storage-image'
import { ImageLightbox } from '@/components/marketplace/ImageLightbox'

interface Event {
  id: string
  title: string
  description: string
  organizer: string
  type: string
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  location: string
  phone: string | null
  email: string | null
  price: number | null
  poster_url: string | null
  slug: string | null
  created_by: string
}

interface EventClientProps {
  event: Event
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3 pt-4 first:pt-0">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 text-foreground">{children}</div>
      </div>
    </div>
  )
}

function CreatedSuccessBanner({ eventSlug }: { eventSlug: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [notifyFailed, setNotifyFailed] = useState(false)
  const createdParam = searchParams.get('created') === '1'

  useEffect(() => {
    if (!createdParam) return

    const failed = searchParams.get('notify') === '0'
    startTransition(() => {
      setNotifyFailed(failed)
      setShowBanner(true)
    })
    router.replace(`/events/${eventSlug}`)
  }, [createdParam, router, eventSlug, searchParams])

  if (!showBanner || dismissed) return null

  return (
    <Alert
      className={
        notifyFailed
          ? 'mb-4 border-amber-200 bg-amber-50 text-amber-950 pr-12'
          : 'mb-4 border-green-200 bg-green-50 text-green-900 pr-12'
      }
    >
      <CheckCircle
        className={
          notifyFailed ? 'h-4 w-4 text-amber-700' : 'h-4 w-4 text-green-700'
        }
      />
      <AlertTitle>Event successfully created</AlertTitle>
      <AlertDescription>
        {notifyFailed ? (
          <>
            Your event is now live on MaltaGuns, but we couldn&apos;t send the
            confirmation notification. You can still manage it from your{' '}
            <Link href="/profile" className="font-medium underline">
              profile
            </Link>
            .
          </>
        ) : (
          <>
            Your event is now live on MaltaGuns.{' '}
            <Link href="/profile" className="font-medium underline">
              View all your events
            </Link>
          </>
        )}
      </AlertDescription>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  )
}

export default function EventClient({ event }: EventClientProps) {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    const updateOwnerStatus = (
      session: import('@supabase/supabase-js').Session | null
    ) => {
      if (session?.user?.id) {
        setCurrentUserId(session.user.id)
      } else {
        setCurrentUserId(null)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      updateOwnerStatus(session)
    })

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateOwnerStatus(session)
    })

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [])

  const formatTime = (time: string | null) => {
    if (!time) return null
    return time.substring(0, 5)
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return 'Free'
    return new Intl.NumberFormat('en-MT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const eventSlug = event.slug || event.id
  const isOwner = currentUserId === event.created_by
  const dateLabel = `${format(new Date(event.start_date), 'MMMM d, yyyy')}${
    event.end_date
      ? ` - ${format(new Date(event.end_date), 'MMMM d, yyyy')}`
      : ''
  }`
  const timeLabel =
    event.start_time &&
    `${formatTime(event.start_time)}${
      event.end_time ? ` - ${formatTime(event.end_time)}` : ''
    }`

  function openLightbox() {
    if (event.poster_url) setLightboxOpen(true)
  }

  function handlePosterKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openLightbox()
    }
  }

  return (
    <PageLayout className="md:py-4 py-3">
      <Suspense fallback={null}>
        <CreatedSuccessBanner eventSlug={eventSlug} />
      </Suspense>

      <div className="mb-4 flex items-center justify-between gap-4">
        <BackButton label="Back" href="/events" hideLabelOnMobile={false} />
        {isOwner && (
          <Button
            onClick={() => router.push(`/events/${eventSlug}/edit`)}
            className="flex items-center"
            variant="outline"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Event
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-card">
        <div
          className={`grid grid-cols-1 gap-6 p-6 lg:gap-8 ${
            event.poster_url
              ? 'lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]'
              : ''
          } items-start`}
        >
          {event.poster_url && (
            <div
              role="button"
              tabIndex={0}
              aria-label={`View ${event.title} poster full screen`}
              className="relative h-[460px] w-full cursor-zoom-in overflow-hidden rounded-lg bg-muted sm:h-[560px] lg:h-[680px]"
              onClick={openLightbox}
              onKeyDown={handlePosterKeyDown}
            >
              <StorageImage
                src={event.poster_url}
                alt={`${event.title} poster`}
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 520px"
                priority
              />
              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Click to enlarge</span>
              </div>
            </div>
          )}

          <div className="min-w-0 space-y-6">
            <div>
              <Badge className="mb-3">{event.type}</Badge>
              <h1 className="text-3xl font-bold">{event.title}</h1>
            </div>

            <div className="divide-y">
              <DetailRow
                icon={<CalendarIcon className="h-4 w-4" />}
                label="Date"
              >
                {dateLabel}
              </DetailRow>

              {timeLabel && (
                <DetailRow icon={<Clock className="h-4 w-4" />} label="Time">
                  {timeLabel}
                </DetailRow>
              )}

              <DetailRow icon={<MapPin className="h-4 w-4" />} label="Location">
                {event.location}
              </DetailRow>

              <DetailRow icon={<Coins className="h-4 w-4" />} label="Price">
                {formatPrice(event.price)}
              </DetailRow>

              <DetailRow icon={<User className="h-4 w-4" />} label="Organizer">
                {event.organizer}
              </DetailRow>

              {event.phone && (
                <DetailRow
                  icon={<Phone className="h-4 w-4" />}
                  label="Contact Phone"
                >
                  <a
                    href={`tel:${event.phone}`}
                    className="text-primary hover:underline"
                  >
                    {event.phone}
                  </a>
                </DetailRow>
              )}

              {event.email && (
                <DetailRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Contact Email"
                >
                  <a
                    href={`mailto:${event.email}`}
                    className="text-primary hover:underline"
                  >
                    {event.email}
                  </a>
                </DetailRow>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="mb-4 text-xl font-semibold">About this event</h2>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{event.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {event.poster_url && (
        <ImageLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          images={[event.poster_url]}
          index={0}
          onIndexChange={() => {}}
          alt={`${event.title} poster`}
        />
      )}
    </PageLayout>
  )
}
