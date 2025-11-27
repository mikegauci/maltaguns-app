import { SupabaseClient } from '@supabase/supabase-js'
import { verifyLicenseImage, verifyIdCardImage } from './document-verification'
import { LicenseTypes } from '@/lib/license-utils'
import React from 'react'

/**
 * Shared configuration and types for document upload handlers
 */
export interface UploadDependencies {
  supabase: SupabaseClient
  toast: (options: {
    title: string
    description?: string | React.ReactElement
    variant?: 'default' | 'destructive' | 'warning' | 'success'
    className?: string
    duration?: number
  }) => void
  setProgress?: (progress: number) => void
}

export interface LicenseUploadResult {
  success: boolean
  publicUrl?: string
  isVerified: boolean
  licenseTypes: LicenseTypes
  expiryDate: string | null
  hasVerificationIssues: boolean
  verificationIssues: string[]
}

export interface IdCardUploadResult {
  success: boolean
  publicUrl?: string
  isVerified: boolean
}

/**
 * Converts HEIC/HEIF files to JPEG format for browser compatibility
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  // Check if file is HEIC/HEIF
  const isHeic =
    file.type.toLowerCase().includes('heic') ||
    file.type.toLowerCase().includes('heif') ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')

  if (!isHeic) {
    return file
  }

  try {
    // Dynamic import to avoid SSR issues
    const heic2any = (await import('heic2any')).default

    // Convert HEIC to JPEG
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    })

    // Handle array of blobs (heic2any can return multiple images)
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

    // Create a new File from the converted blob
    const convertedFile = new File(
      [blob],
      file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
      { type: 'image/jpeg' }
    )

    return convertedFile
  } catch (error) {
    console.error('HEIC conversion error:', error)
    throw new Error(
      'Failed to convert HEIC image. Please try a different format.'
    )
  }
}

/**
 * Validates image file type and size
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  // Accept common image formats including HEIC/HEIF from iPhones
  const validImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
  ]
  const isValidImage = validImageTypes.some(type =>
    file.type.toLowerCase().includes(type.split('/')[1])
  )

  if (!file.type.startsWith('image/') && !isValidImage) {
    return {
      valid: false,
      error: 'Please upload an image file (JPEG, PNG, or HEIC).',
    }
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image must be under ${maxSizeMB}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Uploads and verifies a firearms license image
 */
export async function uploadAndVerifyLicense(
  file: File,
  userFirstName: string,
  userLastName: string,
  deps: UploadDependencies
): Promise<LicenseUploadResult> {
  const { supabase, toast, setProgress } = deps

  try {
    setProgress?.(0)

    // Validate file
    const validation = validateImageFile(file, 5)
    if (!validation.valid) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: validation.error,
      })
      return {
        success: false,
        isVerified: false,
        licenseTypes: {
          tslA: false,
          tslASpecial: false,
          tslB: false,
          hunting: false,
          collectorsA: false,
          collectorsASpecial: false,
        },
        expiryDate: null,
        hasVerificationIssues: false,
        verificationIssues: [],
      }
    }

    setProgress?.(10)

    // Convert HEIC to JPEG if needed
    const convertedFile = await convertHeicToJpeg(file)
    setProgress?.(30)

    // Verify the license image using OCR
    const {
      isVerified: hasPoliceHeader,
      isExpired,
      expiryDate,
      nameMatch,
      extractedName,
      licenseTypes,
    } = await verifyLicenseImage(convertedFile, userFirstName, userLastName)

    setProgress?.(70)

    // Check for verification issues
    const verificationIssues: string[] = []
    if (isExpired) {
      verificationIssues.push(`• License expired on ${expiryDate}`)
    }
    if (!nameMatch && extractedName) {
      verificationIssues.push(
        `• Name mismatch: The License you attached shows a different name than your first and last name as it shows "${userFirstName} ${userLastName}"`
      )
    }
    if (!hasPoliceHeader) {
      verificationIssues.push(
        '• Not recognized as a valid Malta firearms license'
      )
    }

    const hasVerificationIssues = verificationIssues.length > 0
    const isVerified = !hasVerificationIssues

    setProgress?.(80)

    // Upload to Supabase Storage
    const fileExt = convertedFile.name.split('.').pop()
    const fileName = `license-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `licenses/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('licenses')
      .upload(filePath, convertedFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    setProgress?.(95)

    const {
      data: { publicUrl },
    } = supabase.storage.from('licenses').getPublicUrl(filePath)

    setProgress?.(100)

    // Build detected license types message
    const detectedLicenses = []
    if (licenseTypes.tslA) detectedLicenses.push('TSL-A')
    if (licenseTypes.tslASpecial) detectedLicenses.push('TSL-A (special)')
    if (licenseTypes.tslB) detectedLicenses.push('TSL-B')
    if (licenseTypes.hunting) detectedLicenses.push('Hunting')
    if (licenseTypes.collectorsA) detectedLicenses.push('Collectors-A')
    if (licenseTypes.collectorsASpecial)
      detectedLicenses.push('Collectors-A (special)')

    const licensesMessage =
      detectedLicenses.length > 0
        ? `Detected licenses: ${detectedLicenses.join(', ')}`
        : 'No license types detected. Please contact support.'

    // Show appropriate toast
    if (!hasVerificationIssues) {
      if (isVerified) {
        toast({
          variant: 'success',
          title: 'License uploaded and verified',
          description: React.createElement(
            'div',
            {},
            expiryDate &&
              React.createElement('div', {}, `Valid until ${expiryDate}.`),
            React.createElement('div', { className: 'mt-1' }, licensesMessage)
          ),
        })
      } else {
        toast({
          variant: 'warning',
          title: 'License uploaded',
          description: React.createElement(
            'div',
            {},
            React.createElement(
              'div',
              {},
              'Your license has been uploaded but could not be automatically verified.'
            ),
            React.createElement('div', { className: 'mt-1' }, licensesMessage),
            React.createElement(
              'div',
              { className: 'mt-2' },
              'Your license will be reviewed by an administrator.'
            )
          ),
          duration: 20000,
        })
      }
    } else {
      // Show verification issues
      toast({
        variant: 'warning',
        title: 'License uploaded - manual verification required',
        description: React.createElement(
          'div',
          {},
          verificationIssues.map((issue, index) =>
            React.createElement('div', { key: index, className: 'mb-1' }, issue)
          ),
          React.createElement('div', { className: 'mt-1' }, licensesMessage),
          React.createElement(
            'div',
            { className: 'mt-2' },
            'Your license will require manual verification by an administrator.'
          )
        ),
        duration: 20000,
      })
    }

    return {
      success: true,
      publicUrl,
      isVerified,
      licenseTypes,
      expiryDate,
      hasVerificationIssues,
      verificationIssues,
    }
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Upload failed',
      description:
        error instanceof Error ? error.message : 'Failed to upload license.',
    })
    return {
      success: false,
      isVerified: false,
      licenseTypes: {
        tslA: false,
        tslASpecial: false,
        tslB: false,
        hunting: false,
        collectorsA: false,
        collectorsASpecial: false,
      },
      expiryDate: null,
      hasVerificationIssues: false,
      verificationIssues: [],
    }
  } finally {
    setProgress?.(0)
  }
}

/**
 * Uploads and verifies an ID card image
 */
export async function uploadAndVerifyIdCard(
  file: File,
  userFirstName: string,
  userLastName: string,
  deps: UploadDependencies
): Promise<IdCardUploadResult> {
  const { supabase, toast, setProgress } = deps

  try {
    setProgress?.(0)

    // Validate file
    const validation = validateImageFile(file, 5)
    if (!validation.valid) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: validation.error,
      })
      return { success: false, isVerified: false }
    }

    setProgress?.(10)

    // Convert HEIC to JPEG if needed
    const convertedFile = await convertHeicToJpeg(file)
    setProgress?.(30)

    setProgress?.(40)

    // Verify the ID card image using OCR
    const { isVerified, nameMatch, extractedName } = await verifyIdCardImage(
      convertedFile,
      userFirstName,
      userLastName,
      setProgress
    )

    setProgress?.(70)

    // Build verification issue message
    const verificationIssues: string[] = []
    if (!isVerified) {
      if (!nameMatch && extractedName) {
        verificationIssues.push(
          `Name mismatch: ID card shows a different name comapred to your first and last name which shows "${userFirstName} ${userLastName}"`
        )
      } else {
        verificationIssues.push(
          'Not recognized as a valid Malta ID card - missing required text or format'
        )
      }
    }

    setProgress?.(80)

    // Upload to Supabase Storage (regardless of verification status)
    const fileExt = convertedFile.name.split('.').pop()
    const fileName = `id-card-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `id-cards/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('licenses')
      .upload(filePath, convertedFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    setProgress?.(95)

    const {
      data: { publicUrl },
    } = supabase.storage.from('licenses').getPublicUrl(filePath)

    setProgress?.(100)

    // Show appropriate toast based on verification status
    if (isVerified) {
      toast({
        variant: 'success',
        title: 'ID card verified & uploaded',
        description: 'Your ID card has been verified successfully.',
      })
    } else {
      toast({
        variant: 'warning',
        title: 'ID card uploaded - manual verification required',
        description: React.createElement(
          'div',
          {},
          verificationIssues.map((issue, index) =>
            React.createElement(
              'div',
              { key: index, className: 'mb-1' },
              `• ${issue}`
            )
          ),
          React.createElement(
            'div',
            { className: 'mt-2' },
            'Your ID card will require manual verification by an administrator.'
          )
        ),
        duration: 20000,
      })
    }

    return {
      success: true,
      publicUrl,
      isVerified,
    }
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Upload failed',
      description:
        error instanceof Error ? error.message : 'Failed to upload ID card.',
    })
    return { success: false, isVerified: false }
  } finally {
    setProgress?.(0)
  }
}
