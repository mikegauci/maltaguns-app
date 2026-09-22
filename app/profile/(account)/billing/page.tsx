'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listing Credits</CardTitle>
              <CardDescription>
                Available credits for marketplace listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{listingCredits}</div>
                <Button
                  onClick={() => setShowCreditDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Credits
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Credits</CardTitle>
              <CardDescription>
                Available credits for event listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{eventCredits}</div>
                <Button
                  onClick={() => setShowEventCreditDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Credits
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <PaymentHistory
          creditTransactions={creditTransactions}
          listingIdToTitleMap={listingIdToTitleMap}
        />
      </div>
    </ProfilePageLayout>
  )
}
