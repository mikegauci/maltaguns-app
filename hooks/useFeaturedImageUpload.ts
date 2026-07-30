'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  blogImageValidationToast,
  uploadBlogFeaturedImage,
  validateBlogFeaturedImage,
} from '@/lib/blog-images'

type ToastFn = (_options: {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}) => void

export function useFeaturedImageUpload({
  supabase,
  onUploaded,
  toast,
}: {
  supabase: SupabaseClient
  onUploaded: (publicUrl: string) => void
  toast: ToastFn
}) {
  const [uploadingImage, setUploadingImage] = useState(false)

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      const validationError = validateBlogFeaturedImage(file)
      if (validationError) {
        const message = blogImageValidationToast(validationError)
        toast({ variant: 'destructive', ...message })
        return
      }

      setUploadingImage(true)

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error: ' + sessionError.message)
      }

      if (!session?.user.id) {
        throw new Error('Not authenticated')
      }

      const publicUrl = await uploadBlogFeaturedImage(
        supabase,
        file,
        session.user.id
      )

      onUploaded(publicUrl)

      toast({
        title: 'Image uploaded',
        description: 'Your featured image has been uploaded successfully',
      })
    } catch (error) {
      console.error('Image upload error:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload image',
      })
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  return { uploadingImage, handleImageUpload }
}
