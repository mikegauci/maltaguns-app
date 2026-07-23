const DEFAULT_LISTING_IMAGE = '/images/maltaguns-default-img.jpg'

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
