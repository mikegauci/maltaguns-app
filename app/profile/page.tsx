'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, X } from 'lucide-react'
import { FeatureCreditDialog } from '@/components/feature-credit-dialog'
import { CreditDialog } from '@/components/credit-dialog'
import { EventCreditDialog } from '@/components/event-credit-dialog'
import { useSupabase } from '@/components/providers/supabase-provider'
import { LoadingState } from '@/components/ui/loading-state'
import { BackButton } from '@/components/ui/back-button'

// Import types
import { profileSchema, ProfileForm } from './types'

// Import custom hooks
import { useProfileData } from './hooks/useProfileData'

// Import handlers
import { createProfileHandlers } from './handlers/profileHandlers'
import { createContentHandlers } from './handlers/contentHandlers'

// Import components
import { ProfileTabs } from './components/ProfileTabs'

export default function ProfilePage() {
  const { toast } = useToast()
  const { supabase, session } = useSupabase()

  // UI State
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [uploadingIdCard, setUploadingIdCard] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [listingToDelete, setListingToDelete] = useState<string | null>(null)
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false)
  const [listingToFeature, setListingToFeature] = useState<string | null>(null)
  const [removeFeatureDialogOpen, setRemoveFeatureDialogOpen] = useState(false)
  const [listingToRemoveFeature, setListingToRemoveFeature] = useState<
    string | null
  >(null)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [showEventCreditDialog, setShowEventCreditDialog] = useState(false)
  const [establishmentInfoOpen, setEstablishmentInfoOpen] = useState(false)

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      address: '',
    },
  })

  // Use custom hook for data management
  const {
    profile,
    setProfile,
    listings,
    setListings,
    stores,
    setStores,
    clubs,
    setClubs,
    servicing,
    setServicing,
    ranges,
    setRanges,
    blogPosts,
    setBlogPosts,
    events,
    setEvents,
    creditTransactions,
    setCreditTransactions,
    listingIdToTitleMap,
    loading,
    listingCredits,
    eventCredits,
    refreshCredits,
  } = useProfileData({ supabase, session, form })

  // Create handlers
  const profileHandlers = createProfileHandlers({
    supabase,
    toast,
    setProfile,
    setListings,
    profile,
  })

  const contentHandlers = createContentHandlers({
    supabase,
    toast,
    setBlogPosts,
    setEvents,
    setStores,
    setClubs,
    setServicing,
    setRanges,
  })

  // Wrapper functions for handlers that need additional state
  const handleLicenseUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await profileHandlers.handleLicenseUpload(
      event,
      uploadingLicense,
      setUploadingLicense
    )
  }

  const handleIdCardUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await profileHandlers.handleIdCardUpload(
      event,
      uploadingIdCard,
      setUploadingIdCard
    )
  }

  const handleDeleteListing = (listingId: string) =>
    profileHandlers.handleDeleteListing(
      listingId,
      setDeleteDialogOpen,
      setListingToDelete
    )

  const handleRenewalSuccess = () =>
    profileHandlers.handleRenewalSuccess(
      listingToFeature,
      setListingToFeature,
      refreshCredits
    )

  const onSubmit = async (data: ProfileForm) => {
    await profileHandlers.onSubmit(data, setIsEditing)
  }

  const confirmDeleteListing = (listingId: string) => {
    setListingToDelete(listingId)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading profile..." />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Access</CardTitle>
            <CardDescription>
              You need to log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/login">
                <Button className="w-full">Log In</Button>
              </Link>
              <BackButton label="Back to Home" href="/" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading profile data..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and content
          </p>
        </div>

        <ProfileTabs
          profile={profile}
          listings={listings}
          listingCredits={listingCredits}
          blogPosts={blogPosts}
          events={events}
          eventCredits={eventCredits}
          stores={stores}
          clubs={clubs}
          servicing={servicing}
          ranges={ranges}
          creditTransactions={creditTransactions}
          listingIdToTitleMap={listingIdToTitleMap}
          form={form}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          uploadingLicense={uploadingLicense}
          uploadingIdCard={uploadingIdCard}
          establishmentInfoOpen={establishmentInfoOpen}
          setEstablishmentInfoOpen={setEstablishmentInfoOpen}
          onSubmit={onSubmit}
          handleLicenseUpload={handleLicenseUpload}
          handleIdCardUpload={handleIdCardUpload}
          handleRemoveLicense={profileHandlers.handleRemoveLicense}
          handleRemoveIdCard={profileHandlers.handleRemoveIdCard}
          handleListingStatusChange={profileHandlers.handleListingStatusChange}
          handleRenewListing={profileHandlers.handleRenewListing}
          confirmDeleteListing={confirmDeleteListing}
          handleDeletePost={contentHandlers.handleDeletePost}
          handleDeleteEvent={contentHandlers.handleDeleteEvent}
          handleDeleteStore={contentHandlers.handleDeleteStore}
          setListingToFeature={setListingToFeature}
          setFeatureDialogOpen={setFeatureDialogOpen}
          setListingToRemoveFeature={setListingToRemoveFeature}
          setRemoveFeatureDialogOpen={setRemoveFeatureDialogOpen}
          setShowCreditDialog={setShowCreditDialog}
          setShowEventCreditDialog={setShowEventCreditDialog}
        />

        {/* Dialogs */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Listing</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this listing? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  listingToDelete && handleDeleteListing(listingToDelete)
                }
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Listing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {listingToFeature && (
          <FeatureCreditDialog
            open={featureDialogOpen}
            onOpenChange={setFeatureDialogOpen}
            userId={profile?.id ?? ''}
            listingId={listingToFeature ?? ''}
            onSuccess={handleRenewalSuccess}
          />
        )}

        <Dialog
          open={removeFeatureDialogOpen}
          onOpenChange={setRemoveFeatureDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Feature Status</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove the featured status from this
                listing? This will not refund your feature credit.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setRemoveFeatureDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (listingToRemoveFeature) {
                    profileHandlers.handleRemoveFeature(listingToRemoveFeature)
                    setRemoveFeatureDialogOpen(false)
                    setListingToRemoveFeature(null)
                  }
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Remove Feature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CreditDialog
          open={showCreditDialog}
          onOpenChange={setShowCreditDialog}
          userId={profile?.id || ''}
          source="profile"
          onSuccess={() => {
            refreshCredits()
            toast({
              title: 'Credits purchased',
              description: 'Your credits have been added to your account.',
            })
          }}
        />

        <EventCreditDialog
          open={showEventCreditDialog}
          onOpenChange={setShowEventCreditDialog}
          userId={profile?.id || ''}
          onSuccess={() => {
            refreshCredits()
            toast({
              title: 'Event credits purchased',
              description:
                'Your event credits have been added to your account.',
            })
          }}
        />
      </div>
    </div>
  )
}
