import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { UseFormSetValue } from 'react-hook-form'
import { MAX_FILE_SIZE, MAX_FILES, ACCEPTED_IMAGE_TYPES } from '../constants'

interface UseImageUploadProps {
  toast: (options: {
    title: string
    description?: string
    variant?: 'default' | 'destructive'
  }) => void
  setValue: UseFormSetValue<any>
}

export function useImageUpload({ toast, setValue }: UseImageUploadProps) {
  const supabase = createClientComponentClient()
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    try {
      const files = Array.from(event.target.files || [])

      if (files.length + uploadedImages.length > MAX_FILES) {
        toast({
          variant: 'destructive',
          title: 'Too many files',
          description: `Maximum ${MAX_FILES} images allowed`,
        })
        return
      }

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          toast({
            variant: 'destructive',
            title: 'File too large',
            description: `${file.name} exceeds 5MB limit`,
          })
          return
        }

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast({
            variant: 'destructive',
            title: 'Invalid file type',
            description: `${file.name} is not a supported image format`,
          })
          return
        }
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

      const uploadedUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${sessionData.session.user.id}-${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `listings/${fileName}`

        console.log('Attempting to upload file:', filePath)

        const { error: uploadError } = await supabase.storage
          .from('listings')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw new Error('Upload failed: ' + uploadError.message)
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('listings').getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

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

  return {
    uploadedImages,
    uploading,
    handleImageUpload,
    handleDeleteImage,
  }
}
