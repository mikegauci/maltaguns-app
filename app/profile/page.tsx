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
  FeatureCreditDialog,
  DeleteConfirmationDialog,
  RemoveFeatureDialog,
  CreditDialog,
  EventCreditDialog,
} from '@/components/dialogs'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { LoadingState } from '@/components/ui/loading-state'
import { BackButton } from '@/components/ui/back-button'
import { profileSchema, ProfileForm } from './types'
import { useProfileData } from './hooks/useProfileData'
import { createProfileHandlers } from './handlers/profileHandlers'
import { createContentHandlers } from './handlers/contentHandlers'
import { ProfileTabs } from '../../components/profile/ProfileTabs'
import { PageHeader } from '@/components/ui/page-header'

export default function ProfilePage() {
  const { toast } = useToast()
  const { supabase, session } = useSupabase()

  // UI State
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [uploadingIdCard, setUploadingIdCard] = useState(false)
  const [licenseUploadProgress, setLicenseUploadProgress] = useState(0)
  const [idCardUploadProgress, setIdCardUploadProgress] = useState(0)
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
    setLicenseUploadProgress,
    setIdCardUploadProgress,
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
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <PageHeader
          title="My Profile"
          description="Manage your account and content"
        />

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
          licenseUploadProgress={licenseUploadProgress}
          idCardUploadProgress={idCardUploadProgress}
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
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Listing"
          description="Are you sure you want to delete this listing? This action cannot be undone."
          onConfirm={() =>
            listingToDelete && handleDeleteListing(listingToDelete)
          }
          confirmLabel="Delete Listing"
        />

        {listingToFeature && (
          <FeatureCreditDialog
            open={featureDialogOpen}
            onOpenChange={setFeatureDialogOpen}
            userId={profile?.id ?? ''}
            listingId={listingToFeature ?? ''}
            onSuccess={handleRenewalSuccess}
          />
        )}

        <RemoveFeatureDialog
          open={removeFeatureDialogOpen}
          onOpenChange={setRemoveFeatureDialogOpen}
          onConfirm={() => {
            if (listingToRemoveFeature) {
              profileHandlers.handleRemoveFeature(listingToRemoveFeature)
              setRemoveFeatureDialogOpen(false)
              setListingToRemoveFeature(null)
            }
          }}
        />

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
