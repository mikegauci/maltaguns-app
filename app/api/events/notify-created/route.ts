import { z } from 'zod'
import { createNotifyCreatedRoute } from '@/lib/notify-created-route'

export const POST = createNotifyCreatedRoute({
  logLabel: 'NOTIFY EVENT CREATED',
  bodySchema: z.object({
    eventId: z.string().uuid(),
  }),
  getResourceId: body => body.eventId,
  table: 'events',
  select: 'id, created_by, title, slug',
  getOwnerId: resource => resource.created_by as string,
  notFoundMessage: 'Event not found',
  buildNotification: resource => {
    const title = resource.title as string
    const id = resource.id as string
    const slug = resource.slug as string | null
    return {
      type: 'event_created',
      title: 'Event successfully created',
      body: `Your event "${title}" is now live on MaltaGuns. You can manage your events from your profile.`,
      linkUrl: `/events/${slug || id}`,
      dedupeKey: `event_created:${id}`,
    }
  },
})
