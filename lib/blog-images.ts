import type { SupabaseClient } from '@supabase/supabase-js'
import { resizeImageForUpload } from '@/lib/image-resize'

const BLOG_BUCKET = 'blog'

export const BLOG_MAX_FILE_SIZE = 5 * 1024 * 1024

export const BLOG_ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export type BlogImageValidationError =
  | { code: 'file_too_large' }
  | { code: 'invalid_type' }

export function validateBlogFeaturedImage(
  file: File
): BlogImageValidationError | null {
  if (file.size > BLOG_MAX_FILE_SIZE) {
    return { code: 'file_too_large' }
  }

  if (!BLOG_ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { code: 'invalid_type' }
  }

  return null
}

export function blogImageValidationToast(error: BlogImageValidationError): {
  title: string
  description: string
} {
  switch (error.code) {
    case 'file_too_large':
      return {
        title: 'File too large',
        description: 'Featured image must be less than 5MB',
      }
    case 'invalid_type':
      return {
        title: 'Invalid file type',
        description: 'Please upload a valid image file (JPEG, PNG, or WebP)',
      }
  }
}

export async function uploadBlogFeaturedImage(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<string> {
  const resized = await resizeImageForUpload(file)
  const fileExt = resized.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}-${Math.random()}.${fileExt}`
  const filePath = `blog/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(BLOG_BUCKET)
    .upload(filePath, resized, {
      cacheControl: '31536000',
      upsert: false,
      contentType: resized.type,
    })

  if (uploadError) {
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BLOG_BUCKET).getPublicUrl(filePath)

  return publicUrl
}
