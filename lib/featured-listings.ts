export const FEATURE_DAYS = 30
export const LISTING_EXTEND_DAYS = 30
export const FEATURE_RENEW_WITHIN_DAYS = 3

export function getFeatureEndDate(from = new Date()): Date {
  const endDate = new Date(from)
  endDate.setDate(endDate.getDate() + FEATURE_DAYS)
  return endDate
}

export function getListingExtendDate(from = new Date()): Date {
  const endDate = new Date(from)
  endDate.setDate(endDate.getDate() + LISTING_EXTEND_DAYS)
  return endDate
}
