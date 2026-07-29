import type { SupabaseClient } from '@supabase/supabase-js'
import { resizeImageForUpload } from '@/lib/image-resize'

const EVENTS_BUCKET = 'events'

export const EVENT_MAX_FILE_SIZE = 5 * 1024 * 1024

export const EVENT_ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export type EventPosterValidationError =
  | { code: 'file_too_large' }
  | { code: 'invalid_type' }

export function validateEventPoster(
  file: File
): EventPosterValidationError | null {
  if (file.size > EVENT_MAX_FILE_SIZE) {
    return { code: 'file_too_large' }
  }

  if (!EVENT_ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { code: 'invalid_type' }
  }

  return null
}

export function eventPosterValidationToast(
  error: EventPosterValidationError,
  opts?: { includeFileName?: boolean; fileName?: string }
): { title: string; description: string } {
  const includeFileName = opts?.includeFileName ?? false
  const fileName = opts?.fileName

  switch (error.code) {
    case 'file_too_large':
      return {
        title: 'File too large',
        description:
          includeFileName && fileName
            ? `${fileName} exceeds 5MB limit`
            : 'Image must be less than 5MB',
      }
    case 'invalid_type':
      return {
        title: 'Invalid file type',
        description:
          includeFileName && fileName
            ? `${fileName} is not a supported image format`
            : 'Please upload a valid image file (JPEG, PNG, or WebP)',
      }
  }
}

export async function uploadEventPoster(
  supabase: SupabaseClient,
  file: File,
  options: {
    userId: string
    pathMode: 'flat' | 'eventScoped'
    eventId?: string
  }
): Promise<string> {
  const { userId, pathMode, eventId } = options

  if (pathMode === 'eventScoped' && !eventId) {
    throw new Error('eventId is required for eventScoped uploads')
  }

  const resized = await resizeImageForUpload(file)
  const fileExt = resized.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}-${Math.random()}.${fileExt}`
  const filePath =
    pathMode === 'eventScoped'
      ? `events/${eventId}/${fileName}`
      : `events/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(EVENTS_BUCKET)
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
  } = supabase.storage.from(EVENTS_BUCKET).getPublicUrl(filePath)

  return publicUrl
}

export function getEventPosterStoragePathFromUrl(
  imageUrl: string
): string | null {
  if (!imageUrl || imageUrl.startsWith('/')) {
    return null
  }

  const urlParts = imageUrl.split('/')
  const bucketIndex = urlParts.findIndex(part => part === 'events')
  if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
    return null
  }

  const path = urlParts.slice(bucketIndex + 1).join('/')
  return path || null
}

export async function deleteEventPoster(
  supabase: SupabaseClient,
  publicUrl: string
): Promise<void> {
  const path = getEventPosterStoragePathFromUrl(publicUrl)
  if (!path) return

  const { error: deleteError } = await supabase.storage
    .from(EVENTS_BUCKET)
    .remove([path])

  if (deleteError) {
    console.error('Delete error:', deleteError)
  }
}
