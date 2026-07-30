import { createCreditsCreateHandler } from '@/lib/admin-credits'

export const POST = createCreditsCreateHandler({
  table: 'credits',
  incrementExisting: true,
  amountPolicy: 'positive',
  successMessage: 'Credits added successfully',
  failureMessage: 'Failed to add credits',
  logLabel: 'credits',
})
