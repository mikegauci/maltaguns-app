import type { SupabaseClient } from '@supabase/supabase-js'
import { resizeImageForUpload } from '@/lib/image-resize'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
} from '@/app/marketplace/create/constants'

const DEFAULT_LISTING_IMAGE = '/images/maltaguns-default-img.jpg'

const LISTINGS_BUCKET = 'listings'

export type ListingImageValidationError =
  | { code: 'too_many'; max: number }
  | { code: 'file_too_large'; fileName: string }
  | { code: 'invalid_type'; fileName: string }

export function validateListingImageFiles(
  files: File[],
  currentCount: number,
  maxFiles: number = MAX_FILES
): ListingImageValidationError | null {
  if (files.length + currentCount > maxFiles) {
    return { code: 'too_many', max: maxFiles }
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return { code: 'file_too_large', fileName: file.name }
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return { code: 'invalid_type', fileName: file.name }
    }
  }

  return null
}

export function listingImageValidationToast(
  error: ListingImageValidationError
): {
  title: string
  description: string
} {
  switch (error.code) {
    case 'too_many':
      return {
        title: 'Too many files',
        description: `Maximum ${error.max} images allowed`,
      }
    case 'file_too_large':
      return {
        title: 'File too large',
        description: `${error.fileName} exceeds 5MB limit`,
      }
    case 'invalid_type':
      return {
        title: 'Invalid file type',
        description: `${error.fileName} is not a supported image format`,
      }
  }
}

export async function uploadListingImages(params: {
  supabase: SupabaseClient
  files: File[]
  userId: string
  listingId?: string
  shouldContinue?: () => boolean
}): Promise<string[]> {
  const { supabase, files, userId, listingId, shouldContinue } = params
  const uploadedUrls: string[] = []

  for (const file of files) {
    if (shouldContinue && !shouldContinue()) {
      break
    }

    const resized = await resizeImageForUpload(file)
    const fileExt = resized.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}-${Math.random()}.${fileExt}`
    const filePath = listingId
      ? `listings/${listingId}/${fileName}`
      : `listings/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(LISTINGS_BUCKET)
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
    } = supabase.storage.from(LISTINGS_BUCKET).getPublicUrl(filePath)

    uploadedUrls.push(publicUrl)
  }

  return uploadedUrls
}

function escapePostgresArrayElement(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function parseImageUrls(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((url): url is string => typeof url === 'string')
  }

  if (typeof images !== 'string') {
    return []
  }

  try {
    if (images.startsWith('{') && images.endsWith('}')) {
      const content = images.substring(1, images.length - 1)
      if (!content) return []

      return content
        .split(',')
        .map(url => url.trim())
        .map(url =>
          url.startsWith('"') && url.endsWith('"')
            ? url
                .substring(1, url.length - 1)
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
            : url
        )
        .filter(Boolean)
    }

    try {
      const parsed = JSON.parse(images)
      return Array.isArray(parsed)
        ? parsed.filter((url): url is string => typeof url === 'string')
        : []
    } catch {
      return []
    }
  } catch {
    return []
  }
}

export function formatImageUrls(urls: string[]): string {
  if (urls.length === 0) {
    return `{"${DEFAULT_LISTING_IMAGE}"}`
  }
  return `{${urls.map(url => `"${escapePostgresArrayElement(url)}"`).join(',')}}`
}

export function resolveThumbnail(urls: string[]): string {
  return urls[0] || DEFAULT_LISTING_IMAGE
}

export function withoutDefaultListingImage(urls: string[]): string[] {
  return urls.filter(url => url !== DEFAULT_LISTING_IMAGE)
}

export function moveImageToPrimary(urls: string[], index: number): string[] {
  if (index <= 0 || index >= urls.length) return urls
  const next = [...urls]
  const [selected] = next.splice(index, 1)
  next.unshift(selected)
  return next
}

export function isAllowedListingImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false

  if (
    trimmed === DEFAULT_LISTING_IMAGE ||
    (trimmed.startsWith('/images/') && !trimmed.includes('..'))
  ) {
    return true
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return false

    const supabaseHost = new URL(supabaseUrl).hostname
    if (parsed.hostname !== supabaseHost) return false

    return parsed.pathname.includes('/storage/v1/object/public/listings/')
  } catch {
    return false
  }
}

export function getListingStoragePathFromUrl(imageUrl: string): string | null {
  if (
    !imageUrl ||
    imageUrl === DEFAULT_LISTING_IMAGE ||
    imageUrl.startsWith('/')
  ) {
    return null
  }

  const urlParts = imageUrl.split('/')
  const bucketIndex = urlParts.findIndex(part => part === 'listings')
  if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
    return null
  }

  const path = urlParts.slice(bucketIndex + 1).join('/')
  return path || null
}

export { DEFAULT_LISTING_IMAGE }
