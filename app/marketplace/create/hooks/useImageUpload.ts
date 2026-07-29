'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UseFormSetValue } from 'react-hook-form'
import {
  moveImageToPrimary,
  listingImageValidationToast,
  uploadListingImages,
  validateListingImageFiles,
} from '@/lib/listing-images'

interface UseImageUploadProps {
  toast: (_options: {
    title: string
    description?: string
    variant?: 'default' | 'destructive'
  }) => void
  setValue: UseFormSetValue<any>
}

export function useImageUpload({ toast, setValue }: UseImageUploadProps) {
  const supabase = createClient()
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    try {
      const files = Array.from(event.target.files || [])

      const validationError = validateListingImageFiles(
        files,
        uploadedImages.length
      )
      if (validationError) {
        toast({
          variant: 'destructive',
          ...listingImageValidationToast(validationError),
        })
        return
      }

      setUploading(true)
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }

      if (!sessionData.session?.user.id) {
        throw new Error('Not authenticated')
      }

      const uploadedUrls = await uploadListingImages({
        supabase,
        files,
        userId: sessionData.session.user.id,
      })

      const newImages = [...uploadedImages, ...uploadedUrls]
      setUploadedImages(newImages)
      setValue('images', newImages)

      toast({
        title: 'Images uploaded',
        description: 'Your images have been uploaded successfully',
      })
    } catch (error) {
      console.error('Image upload error:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload images',
      })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  function handleDeleteImage(indexToDelete: number): void {
    const newImages = [...uploadedImages]
    newImages.splice(indexToDelete, 1)
    setUploadedImages(newImages)
    setValue('images', newImages)

    toast({
      title: 'Image removed',
      description: 'The image has been removed from your listing',
    })
  }

  function handleSetPrimaryImage(index: number): void {
    const next = moveImageToPrimary(uploadedImages, index)
    if (next === uploadedImages) return
    setUploadedImages(next)
    setValue('images', next)
  }

  return {
    uploadedImages,
    uploading,
    handleImageUpload,
    handleDeleteImage,
    handleSetPrimaryImage,
  }
}
