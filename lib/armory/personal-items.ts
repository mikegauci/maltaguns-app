import { isAllowedListingImageUrl } from '@/lib/listing-images'

export function parsePersonalItemImages(item: {
  images?: string[] | null
  image_url?: string | null
}): string[] {
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images.filter(
      (url): url is string => typeof url === 'string' && url.length > 0
    )
  }
  if (item.image_url) return [item.image_url]
  return []
}

export function normalisePersonalItemImages(images: unknown): string[] {
  if (!Array.isArray(images)) return []
  return images.filter(
    (url): url is string =>
      typeof url === 'string' && isAllowedListingImageUrl(url)
  )
}
