import { formatImageUrls, resolveThumbnail } from '@/lib/listing-images'

export type ListingContentUpdateFields = {
  title?: string
  description?: string
  price?: string | number
  type?: string
  category?: string
  subcategory?: string | null
  calibre?: string | null
  images?: string[]
}

export type BuildListingUpdatePayloadResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string }

function parsePrice(price: string | number | undefined): number | undefined {
  if (price === undefined) return undefined
  if (typeof price === 'number') return price
  const parsed = Number(price)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function buildListingContentUpdatePayload(
  fields: ListingContentUpdateFields,
  options?: { now?: Date }
): BuildListingUpdatePayloadResult {
  const now = options?.now ?? new Date()
  const payload: Record<string, unknown> = {
    updated_at: now.toISOString(),
  }

  if (fields.title !== undefined) payload.title = fields.title
  if (fields.description !== undefined) payload.description = fields.description
  if (fields.type !== undefined) payload.type = fields.type
  if (fields.category !== undefined) payload.category = fields.category
  if (fields.subcategory !== undefined) {
    payload.subcategory = fields.subcategory || null
  }
  if (fields.calibre !== undefined) {
    payload.calibre = fields.calibre || null
  }

  if (fields.price !== undefined) {
    const parsedPrice = parsePrice(fields.price)
    if (parsedPrice === undefined) {
      return { ok: false, error: 'Invalid price. Must be a number.' }
    }
    payload.price = parsedPrice
  }

  if (fields.images !== undefined) {
    payload.images = formatImageUrls(fields.images)
    payload.thumbnail = resolveThumbnail(fields.images)
  }

  return { ok: true, payload }
}
