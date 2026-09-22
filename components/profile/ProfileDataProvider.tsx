'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import nextDynamic from 'next/dynamic'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type UseFormReturn } from 'react-hook-form'
import {
  FeatureCreditDialog,
  DeleteConfirmationDialog,
  RemoveFeatureDialog,
} from '@/components/dialogs'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useToast } from '@/hooks/use-toast'
import { profileSchema, type ProfileForm } from '@/app/profile/types'
import { useProfileData } from '@/app/profile/hooks/useProfileData'
import { createProfileHandlers } from '@/app/profile/handlers/profileHandlers'
import {
  createContentHandlers,
  type EstablishmentTable,
} from '@/app/profile/handlers/contentHandlers'
import type {
  Profile,
  Listing,
  BlogPost,
  Event,
  CreditTransaction,
  Store,
} from '@/app/profile/types'

const CreditDialog = nextDynamic(
  () => import('@/components/dialogs/CreditDialog').then(m => m.CreditDialog),
  { ssr: false }
)

const EventCreditDialog = nextDynamic(
  () =>
    import('@/components/dialogs/EventCreditDialog').then(
      m => m.EventCreditDialog
    ),
  { ssr: false }
)

type ProfileDataContextValue = {
  profile: Profile | null
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>
  listings: Listing[]
  listingCredits: number
  blogPosts: BlogPost[]
  events: Event[]
  eventCredits: number
  stores: Store[]
  clubs: Store[]
  servicing: Store[]
  ranges: Store[]
  creditTransactions: CreditTransaction[]
  listingIdToTitleMap: Record<string, string>
  loading: boolean
  form: UseFormReturn<ProfileForm>
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  uploadingLicense: boolean
  licenseUploadProgress: number
  establishmentInfoOpen: boolean
  setEstablishmentInfoOpen: (value: boolean) => void
  onSubmit: (data: ProfileForm) => Promise<void>
  handleLicenseUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>
  handleRemoveLicense: () => Promise<void>
  onIdentityChange: (update: {
    identity_verified: boolean
    identity_status: string | null
    identity_first_name: string | null
    identity_last_name: string | null
    identity_document_type: string | null
    identity_review_notes: string[] | null
  }) => void
  handleListingStatusChange: (
    listingId: string,
    newStatus: string
  ) => Promise<void>
  handleRenewListing: (listingId: string) => Promise<void>
  confirmDeleteListing: (listingId: string) => void
  handleDeletePost: (postId: string) => Promise<void>
  handleDeleteEvent: (eventId: string) => Promise<void>
  handleDeleteEstablishment: (
    establishmentId: string,
    table: EstablishmentTable
  ) => Promise<void>
  setListingToFeature: (listingId: string | null) => void
  setFeatureDialogOpen: (open: boolean) => void
  setListingToRemoveFeature: (listingId: string | null) => void
  setRemoveFeatureDialogOpen: (open: boolean) => void
  setShowCreditDialog: (open: boolean) => void
  setShowEventCreditDialog: (open: boolean) => void
}

const ProfileDataContext = createContext<ProfileDataContextValue | null>(null)

export function useProfileContext() {
  const context = useContext(ProfileDataContext)
  if (!context) {
    throw new Error('useProfileContext must be used within ProfileDataProvider')
  }
  return context
}

export function ProfileDataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const { supabase, session } = useSupabase()

  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLicense, setUploadingLicense] = useState(false)
  const [licenseUploadProgress, setLicenseUploadProgress] = useState(0)
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
      birthday: '',
      phone: '',
      address: '',
    },
  })

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
  } = useProfileData({ supabase, session, form })

  const profileHandlers = createProfileHandlers({
    supabase,
    toast,
    setProfile,
    setListings,
    profile,
    setLicenseUploadProgress,
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

  const handleLicenseUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await profileHandlers.handleLicenseUpload(
      event,
      uploadingLicense,
      setUploadingLicense
    )
  }

  const handleIdentityChange = (update: {
    identity_verified: boolean
    identity_status: string | null
    identity_first_name: string | null
    identity_last_name: string | null
    identity_document_type: string | null
    identity_review_notes: string[] | null
  }) => {
    setProfile(prev => (prev ? { ...prev, ...update } : null))
  }

  const handleDeleteListing = (listingId: string) =>
    profileHandlers.handleDeleteListing(
      listingId,
      setDeleteDialogOpen,
      setListingToDelete
    )

  const onSubmit = async (data: ProfileForm) => {
    await profileHandlers.onSubmit(data, setIsEditing)
  }

  const confirmDeleteListing = (listingId: string) => {
    setListingToDelete(listingId)
    setDeleteDialogOpen(true)
  }

  const value: ProfileDataContextValue = {
    profile,
    setProfile,
    listings,
    listingCredits,
    blogPosts,
    events,
    eventCredits,
    stores,
    clubs,
    servicing,
    ranges,
    creditTransactions,
    listingIdToTitleMap,
    loading,
    form,
    isEditing,
    setIsEditing,
    uploadingLicense,
    licenseUploadProgress,
    establishmentInfoOpen,
    setEstablishmentInfoOpen,
    onSubmit,
    handleLicenseUpload,
    handleRemoveLicense: profileHandlers.handleRemoveLicense,
    onIdentityChange: handleIdentityChange,
    handleListingStatusChange: profileHandlers.handleListingStatusChange,
    handleRenewListing: profileHandlers.handleRenewListing,
    confirmDeleteListing,
    handleDeletePost: contentHandlers.handleDeletePost,
    handleDeleteEvent: contentHandlers.handleDeleteEvent,
    handleDeleteEstablishment: contentHandlers.handleDeleteEstablishment,
    setListingToFeature,
    setFeatureDialogOpen,
    setListingToRemoveFeature,
    setRemoveFeatureDialogOpen,
    setShowCreditDialog,
    setShowEventCreditDialog,
  }

  return (
    <ProfileDataContext.Provider value={value}>
      {children}

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

      {listingToFeature && profile && (
        <FeatureCreditDialog
          open={featureDialogOpen}
          onOpenChange={setFeatureDialogOpen}
          userId={profile.id}
          listingId={listingToFeature}
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

      {showCreditDialog && profile && (
        <CreditDialog
          open={showCreditDialog}
          onOpenChange={setShowCreditDialog}
          userId={profile.id}
          source="profile"
        />
      )}

      {showEventCreditDialog && profile && (
        <EventCreditDialog
          open={showEventCreditDialog}
          onOpenChange={setShowEventCreditDialog}
          userId={profile.id}
        />
      )}
    </ProfileDataContext.Provider>
  )
}
