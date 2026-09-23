'use client'

import { AppCard } from '@/components/design-system'
import { Button } from '@/components/ui/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PaymentHistory } from '@/components/profile/PaymentHistory'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { useProfileContext } from '@/components/profile/ProfileDataProvider'

export default function ProfileBillingPage() {
  const {
    listingCredits,
    eventCredits,
    creditTransactions,
    listingIdToTitleMap,
    setShowCreditDialog,
    setShowEventCreditDialog,
  } = useProfileContext()

  return (
    <ProfilePageLayout
      title="Billing"
      description="Credits and payment history"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <AppCard>
            <CardHeader>
              <CardTitle className="text-lg">Listing Credits</CardTitle>
              <CardDescription>
                Available credits for marketplace listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold tabular-nums">
                  {listingCredits}
                </div>
                <Button onClick={() => setShowCreditDialog(true)}>
                  Add Credits
                </Button>
              </div>
            </CardContent>
          </AppCard>

          <AppCard>
            <CardHeader>
              <CardTitle className="text-lg">Event Credits</CardTitle>
              <CardDescription>
                Available credits for event listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold tabular-nums">
                  {eventCredits}
                </div>
                <Button onClick={() => setShowEventCreditDialog(true)}>
                  Add Credits
                </Button>
              </div>
            </CardContent>
          </AppCard>
        </div>

        <PaymentHistory
          creditTransactions={creditTransactions}
          listingIdToTitleMap={listingIdToTitleMap}
        />
      </div>
    </ProfilePageLayout>
  )
}
