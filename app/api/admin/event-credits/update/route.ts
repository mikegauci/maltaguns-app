import { createCreditsUpdateHandler } from '@/lib/admin-credits'

export const PATCH = createCreditsUpdateHandler({
  table: 'credits_events',
  identifyBy: 'user_created_at',
  amountPolicy: 'nonNegative',
  successMessage: 'Event credits updated successfully',
  failureMessage: 'Failed to update event credits',
  notFoundMessage: 'Event credit record not found',
  missingIdentityMessage:
    'User ID and created_at are required to identify the event credit',
})
