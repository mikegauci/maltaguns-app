import { SupabaseClient } from '@supabase/supabase-js'
import { verifyLicenseImage, verifyIdCardImage } from '@/utils/document-verification'
import { Profile, Listing, ProfileForm } from '../types'
import React from 'react'
import heic2any from 'heic2any'

/**
 * Converts HEIC/HEIF images to JPEG for browser compatibility
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') || 
                 file.name.toLowerCase().endsWith('.heif')
  
  if (!isHeic) {
    return file // Return original file if not HEIC
  }

  try {
    console.log('Converting HEIC image to JPEG...')
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    })

    // heic2any can return Blob or Blob[], handle both cases
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
    
    // Create a new File from the converted Blob
    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
    const convertedFile = new File([blob], newFileName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
    
    console.log(`✓ Converted ${file.name} to ${newFileName}`)
    return convertedFile
  } catch (error) {
    console.error('Error converting HEIC to JPEG:', error)
    throw new Error('Failed to convert HEIC image. Please try a JPEG or PNG instead.')
  }
}

interface HandlerDependencies {
  supabase: SupabaseClient
  toast: any
  setProfile: (
    profile: Profile | null | ((prev: Profile | null) => Profile | null)
  ) => void
  setListings: (listings: Listing[] | ((prev: Listing[]) => Listing[])) => void
  profile: Profile | null
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
  const { supabase, toast, setProfile, setListings, profile } = deps

  async function handleLicenseUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    uploadingLicense: boolean,
    setUploadingLicense: (value: boolean) => void
  ) {
    try {
      const originalFile = event.target.files?.[0]
      if (!originalFile) return

      setUploadingLicense(true)

      // Accept common image formats including HEIC/HEIF from iPhones
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
      const isValidImage = validImageTypes.some(type => originalFile.type.toLowerCase().includes(type.split('/')[1]))
      
      if (!originalFile.type.startsWith('image/') && !isValidImage) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload an image file (JPEG, PNG, or HEIC).',
        })
        return
      }

      if (originalFile.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'License image must be under 5MB.',
        })
        return
      }

      // Convert HEIC to JPEG if needed (for browser compatibility)
      const file = await convertHeicToJpeg(originalFile)

      // Get user's name from profile for verification
      const userFirstName = profile?.first_name ?? undefined
      const userLastName = profile?.last_name ?? undefined

      const {
        isVerified,
        isExpired,
        expiryDate,
        correctedImageUrl,
        nameMatch,
        extractedName,
        nameMatchDetails,
        licenseTypes,
      } = await verifyLicenseImage(file, userFirstName, userLastName)

      // Check for verification issues - continue with upload but mark as not verified
      const hasNameMismatch = userFirstName && userLastName && !nameMatch
      const hasVerificationIssues = isExpired || hasNameMismatch

      // Build combined warning message if there are issues
      if (hasVerificationIssues) {
        const issues: string[] = []

        if (isExpired && expiryDate) {
          issues.push(`• License expired on ${expiryDate}`)
        } else if (isExpired) {
          issues.push(`• License appears to be expired`)
        }

        if (hasNameMismatch && nameMatchDetails) {
          issues.push(
            `• Name mismatch: License shows "${nameMatchDetails.licenseName}" but profile shows "${nameMatchDetails.profileName}"`
          )
        } else if (hasNameMismatch) {
          issues.push(
            `• Name on license does not match profile${extractedName ? `: ${extractedName}` : ''}`
          )
        }

        toast({
          title: 'License uploaded - manual verification required',
          description:
            issues.length > 0
              ? React.createElement(
                  'div',
                  { className: 'space-y-2' },
                  ...issues.map((issue, index) =>
                    React.createElement('div', { key: index }, issue)
                  ),
                  React.createElement(
                    'div',
                    { className: 'mt-3' },
                    'Your license will require manual verification by an administrator.'
                  )
                )
              : 'Your license will require manual verification by an administrator.',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        })
      }

      const imageToUpload = correctedImageUrl
        ? await urlToFile(correctedImageUrl, `rotated-${file.name}`, file.type)
        : file

      const fileExt = file.name.split('.').pop()
      const fileName = `license-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `licenses/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, imageToUpload)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('licenses').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          license_image: publicUrl,
          is_seller: true,
          is_verified: isVerified,
          license_types: licenseTypes,
        })
        .eq('id', profile?.id)

      if (updateError) throw updateError

      setProfile(prev =>
        prev
          ? {
              ...prev,
              license_image: publicUrl,
              is_seller: true,
              is_verified: isVerified,
              license_types: licenseTypes as any,
            }
          : null
      )

      // Build detected license types message
      const detectedLicenses = []
      if (licenseTypes.tslA) detectedLicenses.push('TSL-A')
      if (licenseTypes.tslASpecial) detectedLicenses.push('TSL-A (special)')
      if (licenseTypes.tslB) detectedLicenses.push('TSL-B')
      if (licenseTypes.hunting) detectedLicenses.push('Hunting')
      if (licenseTypes.collectorsA) detectedLicenses.push('Collectors-A')
      if (licenseTypes.collectorsASpecial) detectedLicenses.push('Collectors-A (special)')

      const licensesMessage = detectedLicenses.length > 0 
        ? `Detected licenses: ${detectedLicenses.join(', ')}`
        : 'No license types detected. Please contact support.'

      // Show success toast only if no issues were found
      if (!hasVerificationIssues) {
        if (isVerified) {
          toast({
            title: 'License uploaded and verified',
            description: React.createElement(
              'div',
              {},
              expiryDate && React.createElement('div', {}, `Valid until ${expiryDate}.`),
              React.createElement('div', { className: 'mt-1' }, licensesMessage)
            ),
            className: 'bg-green-600 text-white border-green-600',
          })
        } else {
          toast({
            title: 'License uploaded',
            description: React.createElement(
              'div',
              {},
              React.createElement('div', {}, 'Your license has been uploaded but could not be automatically verified.'),
              React.createElement('div', { className: 'mt-1' }, licensesMessage),
              React.createElement('div', { className: 'mt-2' }, 'Your license will be reviewed by an administrator.')
            ),
            className: 'bg-amber-100 text-amber-800 border-amber-200',
          })
        }
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
    try {
      const originalFile = event.target.files?.[0]
      if (!originalFile) return

      setUploadingIdCard(true)

      // Accept common image formats including HEIC/HEIF from iPhones
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
      const isValidImage = validImageTypes.some(type => originalFile.type.toLowerCase().includes(type.split('/')[1]))
      
      if (!originalFile.type.startsWith('image/') && !isValidImage) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload an image file (JPEG, PNG, or HEIC).',
        })
        return
      }

      if (originalFile.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'ID card image must be under 5MB.',
        })
        return
      }

      // Convert HEIC to JPEG if needed (for browser compatibility)
      const file = await convertHeicToJpeg(originalFile)

      // Get user's name from profile for verification
      const userFirstName = profile?.first_name ?? ''
      const userLastName = profile?.last_name ?? ''

      // Verify the ID card image using OCR
      const { isVerified, nameMatch, extractedName } = await verifyIdCardImage(
        file,
        userFirstName,
        userLastName
      )

      if (!isVerified) {
        if (!nameMatch && extractedName) {
          toast({
            variant: 'destructive',
            title: 'ID card verification failed',
            description: `The name on the ID card (${extractedName}) does not match your profile name (${userFirstName} ${userLastName}).`,
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Invalid ID card',
            description:
              'This does not appear to be a valid Malta ID card. Please ensure the image shows "KARTA TAL-IDENTITA" or "IDENTITY CARD".',
          })
        }
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `id-card-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `id-cards/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('licenses').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          id_card_image: publicUrl,
        })
        .eq('id', profile?.id)

      if (updateError) throw updateError

      setProfile(prev =>
        prev
          ? {
              ...prev,
              id_card_image: publicUrl,
            }
          : null
      )

      toast({
        title: 'ID card verified & uploaded',
        description: `Your ID card has been verified successfully. Name: ${extractedName}`,
        className: 'bg-green-600 text-white border-green-600',
      })
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
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev =>
        prev
          ? {
              ...prev,
              id_card_image: null,
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
