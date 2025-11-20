import { SupabaseClient } from '@supabase/supabase-js'
import {
  uploadAndVerifyLicense,
  uploadAndVerifyIdCard,
} from '@/utils/document-upload-handlers'
import { Profile, Listing, ProfileForm } from '../types'
import React from 'react'

/**
 * @deprecated Moved to document-upload-handlers.ts
 */

interface HandlerDependencies {
  supabase: SupabaseClient
  toast: any
  setProfile: (
    profile: Profile | null | ((prev: Profile | null) => Profile | null)
  ) => void
  setListings: (listings: Listing[] | ((prev: Listing[]) => Listing[])) => void
  profile: Profile | null
  setLicenseUploadProgress?: (progress: number) => void
  setIdCardUploadProgress?: (progress: number) => void
}

// Helper: Convert data URL to File
export async function urlToFile(
  url: string,
  filename: string,
  mimeType: string
): Promise<File> {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  return new File([buf], filename, { type: mimeType })
}

export function createProfileHandlers(deps: HandlerDependencies) {
  const {
    supabase,
    toast,
    setProfile,
    setListings,
    profile,
    setLicenseUploadProgress,
    setIdCardUploadProgress,
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
          })
          .eq('id', profile?.id)

        if (updateError) throw updateError

        setProfile(prev =>
          prev
            ? {
                ...prev,
                license_image: result.publicUrl || null,
                is_seller: true,
                is_verified: result.isVerified,
                license_types: result.licenseTypes as any,
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

  async function handleIdCardUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    uploadingIdCard: boolean,
    setUploadingIdCard: (value: boolean) => void
  ) {
    const originalFile = event.target.files?.[0]
    if (!originalFile) return

    setUploadingIdCard(true)

    try {
      const result = await uploadAndVerifyIdCard(
        originalFile,
        profile?.first_name ?? '',
        profile?.last_name ?? '',
        {
          supabase,
          toast,
          setProgress: setIdCardUploadProgress,
        }
      )

      if (result.success && result.publicUrl) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            id_card_image: result.publicUrl,
            id_card_verified: result.isVerified,
          })
          .eq('id', profile?.id)

        if (updateError) throw updateError

        setProfile(prev =>
          prev
            ? {
                ...prev,
                id_card_image: result.publicUrl || null,
                id_card_verified: result.isVerified,
              }
            : null
        )
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload ID card.',
      })
    } finally {
      setUploadingIdCard(false)
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

  async function handleRemoveIdCard() {
    try {
      if (!profile?.id) return

      const { error } = await supabase
        .from('profiles')
        .update({
          id_card_image: null,
          id_card_verified: false,
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev =>
        prev
          ? {
              ...prev,
              id_card_image: null,
              id_card_verified: false,
            }
          : null
      )

      toast({
        title: 'ID card removed',
        description: 'Your ID card has been removed successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description:
          error instanceof Error ? error.message : 'Failed to remove ID card.',
      })
    }
  }

  async function onSubmit(
    data: ProfileForm,
    setIsEditing: (value: boolean) => void
  ) {
    try {
      if (!profile?.id) return

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
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
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      const { error } = await supabase.rpc('update_listing_status', {
        listing_id: id,
        new_status: value,
        user_id: userData.user.id,
      })

      if (error) throw error

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
        body: JSON.stringify({ listingId, userId: session.session.user.id }),
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
        const { error } = await supabase.rpc('relist_listing', {
          listing_id: listingId,
        })
        if (error) throw new Error('Failed to renew listing')
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

      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      const expiryResponse = await fetch('/api/listings/update-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listingToFeature }),
      })

      if (!expiryResponse.ok) throw new Error('Failed to extend listing expiry')

      const featureResponse = await fetch('/api/listings/renew-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.user.id,
          listingId: listingToFeature,
        }),
      })

      if (!featureResponse.ok) throw new Error('Failed to renew feature')

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingToFeature
            ? {
                ...listing,
                expires_at: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
                days_until_expiration: 30,
                is_near_expiration: false,
                is_featured: true,
                featured_days_remaining: 15,
              }
            : listing
        )
      )

      refreshCredits()

      toast({
        title: 'Listing featured and renewed',
        description:
          'Your listing has been featured for 15 days and renewed for 30 days.',
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
    handleIdCardUpload,
    handleRemoveLicense,
    handleRemoveIdCard,
    onSubmit,
    handleListingStatusChange,
    handleDeleteListing,
    handleRenewListing,
    handleRenewalSuccess,
    handleRemoveFeature,
  }
}
