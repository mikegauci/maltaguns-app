import { createCreditsCreateHandler } from '@/lib/admin-credits'

export const POST = createCreditsCreateHandler({
  table: 'credits_events',
  incrementExisting: false,
  amountPolicy: 'nonNegative',
  successMessage: 'Event credits added successfully',
  failureMessage: 'Failed to add event credits',
})
