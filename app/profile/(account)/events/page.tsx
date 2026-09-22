'use client'

import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { AppCard } from '@/components/design-system'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { MyEvents } from '@/components/profile/MyEvents'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { useProfileContext } from '@/components/profile/ProfileDataProvider'

export default function ProfileEventsPage() {
  const { events, eventCredits, handleDeleteEvent, setShowEventCreditDialog } =
    useProfileContext()

  return (
    <ProfilePageLayout
      title="Events"
      description="Create and manage shooting events"
    >
      {events.length > 0 ? (
        <MyEvents
          events={events}
          eventCredits={eventCredits}
          handleDeleteEvent={handleDeleteEvent}
          setShowEventCreditDialog={setShowEventCreditDialog}
        />
      ) : (
        <AppCard>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No events yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Create and manage shooting events for the community
            </p>
            <Link href="/events/create">
              <Button>
                <Calendar className="mr-2 h-4 w-4" />
                Create Your First Event
              </Button>
            </Link>
          </CardContent>
        </AppCard>
      )}
    </ProfilePageLayout>
  )
}
