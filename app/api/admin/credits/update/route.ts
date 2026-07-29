import { createCreditsUpdateHandler } from '@/lib/admin-credits'

export const PATCH = createCreditsUpdateHandler({
  table: 'credits',
  identifyBy: 'id',
  amountPolicy: 'positive',
  successMessage: 'Credits updated successfully',
  failureMessage: 'Failed to update credits',
  notFoundMessage: 'Credit record not found',
  missingIdentityMessage: 'Credit ID is required',
  logLabel: 'credits',
})
