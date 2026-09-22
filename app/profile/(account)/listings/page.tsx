'use client'

import { MyListings } from '@/components/profile/MyListings'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { useProfileContext } from '@/components/profile/ProfileDataProvider'

export default function ProfileListingsPage() {
  const {
    listings,
    listingCredits,
    handleListingStatusChange,
    handleRenewListing,
    confirmDeleteListing,
    setListingToFeature,
    setFeatureDialogOpen,
    setListingToRemoveFeature,
    setRemoveFeatureDialogOpen,
    setShowCreditDialog,
  } = useProfileContext()

  return (
    <ProfilePageLayout
      title="Listings"
      description="Manage your marketplace listings and credits"
    >
      <MyListings
        listings={listings}
        listingCredits={listingCredits}
        handleListingStatusChange={handleListingStatusChange}
        handleRenewListing={handleRenewListing}
        confirmDeleteListing={confirmDeleteListing}
        setListingToFeature={setListingToFeature}
        setFeatureDialogOpen={setFeatureDialogOpen}
        setListingToRemoveFeature={setListingToRemoveFeature}
        setRemoveFeatureDialogOpen={setRemoveFeatureDialogOpen}
        setShowCreditDialog={setShowCreditDialog}
      />
    </ProfilePageLayout>
  )
}
