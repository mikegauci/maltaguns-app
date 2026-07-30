import { z } from 'zod'
import { createNotifyCreatedRoute } from '@/lib/notify-created-route'
import { slugify } from '@/lib/format'

export const POST = createNotifyCreatedRoute({
  logLabel: 'NOTIFY CREATED',
  bodySchema: z.object({
    listingId: z.string().uuid(),
  }),
  getResourceId: body => body.listingId,
  table: 'listings',
  select: 'id, seller_id, title',
  getOwnerId: resource => resource.seller_id as string,
  notFoundMessage: 'Listing not found',
  buildNotification: resource => {
    const title = resource.title as string
    const id = resource.id as string
    return {
      type: 'listing_created',
      title: 'Listing successfully created',
      body: `Your listing "${title}" is now live on MaltaGuns. You can manage all your listings from your profile.`,
      linkUrl: `/marketplace/listing/${slugify(title)}`,
      dedupeKey: `listing_created:${id}`,
    }
  },
})
