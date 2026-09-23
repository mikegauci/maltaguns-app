import { SupabaseClient } from '@supabase/supabase-js'
import { FEATURE_DAYS, LISTING_EXTEND_DAYS } from '@/lib/featured-listings'
import { normalizeBirthdayForInput } from '@/lib/format'
import { uploadAndVerifyLicense } from '@/utils/document-upload-handlers'
import { Profile, Listing, ProfileForm } from '../types'
import React from 'react'

interface HandlerDependencies {
  supabase: SupabaseClient
  toast: any
  setProfile: (
    profile: Profile | null | ((prev: Profile | null) => Profile | null)
  ) => void
  setListings: (listings: Listing[] | ((prev: Listing[]) => Listing[])) => void
  profile: Profile | null
  setLicenseUploadProgress?: (progress: number) => void
}

// Helper: The licenses bucket is private, so the raw stored URL from an
// upload can't be rendered directly - fetch a freshly signed one instead.
async function resolveSignedLicenseUrl(fallbackUrl: string): Promise<string> {
  try {
    const res = await fetch('/api/profile/document-urls')
    if (!res.ok) return fallbackUrl
    const { licenseUrl } = await res.json()
    return licenseUrl || fallbackUrl
  } catch {
    return fallbackUrl
  }
}

export function createProfileHandlers(deps: HandlerDependencies) {
  const {
    supabase,
    toast,
    setProfile,
    setListings,
    profile,
    setLicenseUploadProgress,
  } = deps

  async function handleLicenseUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    uploadingLicense: boolean,
    setUploadingLicense: (value: boolean) => void
  ) {
    const originalFile = event.target.files?.[0]
    if (!originalFile) return

    setUploadingLicense(true)

    try {
      const result = await uploadAndVerifyLicense(
        originalFile,
        profile?.first_name ?? '',
        profile?.last_name ?? '',
        {
          supabase,
          toast,
          setProgress: setLicenseUploadProgress,
        }
      )

      if (result.success && result.publicUrl) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            license_image: result.publicUrl,
            is_seller: true,
            is_verified: result.isVerified,
            license_types: result.licenseTypes as any,
            license_expiry_date: result.expiryDate,
          })
          .eq('id', profile?.id)

        if (updateError) throw updateError

        // The licenses bucket is private - resolve a signed URL for the
        // freshly uploaded file so the preview renders immediately.
        const signedLicenseUrl = await resolveSignedLicenseUrl(result.publicUrl)

        setProfile(prev =>
          prev
            ? {
                ...prev,
                license_image: signedLicenseUrl,
                is_seller: true,
                is_verified: result.isVerified,
                license_types: result.licenseTypes as any,
                license_expiry_date: result.expiryDate,
              }
            : null
        )
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload license.',
      })
    } finally {
      setUploadingLicense(false)
    }
  }

  async function handleRemoveLicense() {
    try {
      if (!profile?.id) return

      const { error } = await supabase
        .from('profiles')
        .update({
          license_image: null,
          is_seller: false,
          is_verified: false,
          license_types: null,
          license_expiry_date: null,
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev =>
        prev
          ? {
              ...prev,
              license_image: null,
              is_seller: false,
              is_verified: false,
              license_types: null,
              license_expiry_date: null,
            }
          : null
      )

      toast({
        title: 'License removed',
        description: 'Your license has been removed successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description:
          error instanceof Error ? error.message : 'Failed to remove license.',
      })
    }
  }

  async function onSubmit(
    data: ProfileForm,
    setIsEditing: (value: boolean) => void
  ) {
    try {
      if (!profile?.id) return

      if (profile.identity_verified) {
        const nameChanged =
          data.first_name !== profile.first_name ||
          data.last_name !== profile.last_name

        if (nameChanged) {
          toast({
            variant: 'destructive',
            title: 'Name cannot be changed',
            description:
              'Your name is locked after identity verification. Contact Info@maltaguns.com if it needs updating.',
          })
          return
        }
      }

      const nextBirthday = normalizeBirthdayForInput(data.birthday)
      const currentBirthday = normalizeBirthdayForInput(profile.birthday)
      const birthdayChanged = nextBirthday !== currentBirthday

      if (profile.identity_verified && birthdayChanged) {
        const response = await fetch('/api/profile/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update profile')
        }

        setProfile(prev =>
          prev
            ? {
                ...prev,
                first_name: data.first_name,
                last_name: data.last_name,
                birthday: nextBirthday,
                phone: data.phone,
                address: data.address,
                identity_verified: false,
                identity_verified_at: null,
                identity_status: 'Not Started',
                identity_first_name: null,
                identity_last_name: null,
                identity_document_type: null,
                identity_review_notes: null,
                didit_session_id: null,
                didit_session_url: null,
                didit_session_created_at: null,
              }
            : null
        )
        setIsEditing(false)

        toast({
          title: 'Profile updated',
          description:
            'Your date of birth was updated. Please verify your identity again.',
        })
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          birthday: nextBirthday,
          phone: data.phone,
          address: data.address,
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev =>
        prev
          ? {
              ...prev,
              first_name: data.first_name,
              last_name: data.last_name,
              birthday: nextBirthday,
              phone: data.phone,
              address: data.address,
            }
          : null
      )
      setIsEditing(false)

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          error instanceof Error ? error.message : 'Failed to update profile.',
      })
    }
  }

  async function handleListingStatusChange(
    id: string,
    value: string
  ): Promise<void> {
    try {
      const response = await fetch('/api/listings/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: id, status: value }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update listing status')
      }

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === id ? { ...listing, status: value } : listing
        )
      )

      toast({
        title: 'Listing updated',
        description:
          'The status of your listing has been updated successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update listing status.',
      })
    }
  }

  async function handleDeleteListing(
    listingId: string,
    setDeleteDialogOpen: (value: boolean) => void,
    setListingToDelete: (value: string | null) => void
  ) {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.user) {
        toast({
          variant: 'destructive',
          title: 'Unauthorized',
          description: 'You must be logged in to delete a listing',
        })
        return
      }

      const response = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete listing')
      }

      setListings(prevListings =>
        prevListings.filter(listing => listing.id !== listingId)
      )

      toast({
        title: 'Listing deleted',
        description: 'Your listing has been deleted successfully',
      })

      setDeleteDialogOpen(false)
      setListingToDelete(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete listing',
      })
      setDeleteDialogOpen(false)
      setListingToDelete(null)
    }
  }

  async function handleRenewListing(listingId: string): Promise<void> {
    try {
      const response = await fetch('/api/listings/update-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to renew listing')
      }

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
              }
            : listing
        )
      )

      toast({
        title: 'Listing renewed',
        description: 'Your listing has been renewed for another 30 days.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Renewal failed',
        description:
          error instanceof Error ? error.message : 'Failed to renew listing.',
      })
    }
  }

  async function handleRenewalSuccess(
    listingToFeature: string | null,
    setListingToFeature: (value: string | null) => void,
    refreshCredits: () => Promise<void>
  ): Promise<void> {
    try {
      if (!listingToFeature) return

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingToFeature
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + LISTING_EXTEND_DAYS * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: LISTING_EXTEND_DAYS,
                is_near_expiration: false,
                is_featured: true,
                featured_days_remaining: FEATURE_DAYS,
              }
            : listing
        )
      )

      refreshCredits()

      toast({
        title: 'Listing featured and renewed',
        description: `Your listing has been featured for ${FEATURE_DAYS} days and renewed for ${LISTING_EXTEND_DAYS} days.`,
      })

      setListingToFeature(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Featuring failed',
        description:
          error instanceof Error ? error.message : 'Failed to feature listing.',
      })
    }
  }

  async function handleRemoveFeature(listingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('featured_listings')
        .delete()
        .eq('listing_id', listingId)

      if (error) throw error

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? { ...listing, is_featured: false, featured_days_remaining: 0 }
            : listing
        )
      )

      toast({
        title: 'Feature removed',
        description: 'Featured status has been removed from your listing.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to remove feature.',
      })
    }
  }

  return {
    handleLicenseUpload,
    handleRemoveLicense,
    onSubmit,
    handleListingStatusChange,
    handleDeleteListing,
    handleRenewListing,
    handleRenewalSuccess,
    handleRemoveFeature,
  }
}
