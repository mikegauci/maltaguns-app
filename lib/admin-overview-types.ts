export type AdminOverviewActionQueue = {
  identityReviewsPending: number | null
  reportedListingsPending: number
  establishmentsPending: number
  licenseReviewsPending: number
}

export type AdminOverviewStats = {
  totalUsers: number
  newUsers7d: number
  activeListings: number
  pendingListings: number
  revenue30d: number | null
  upcomingEvents: number
  totalEvents: number
}

export type AdminOverviewRecentSignup = {
  id: string
  username: string
  email: string
  createdAt: string
}

export type AdminOverviewRecentPayment = {
  id: string
  username: string
  amount: number
  type: string
  createdAt: string
}

export type AdminOverviewBlogSnapshot = {
  publishedPosts: number
  totalViews: number
}

export type AdminOverviewResponse = {
  actionQueue: AdminOverviewActionQueue
  stats: AdminOverviewStats
  recentSignups: AdminOverviewRecentSignup[]
  recentPayments: AdminOverviewRecentPayment[]
  blog: AdminOverviewBlogSnapshot | null
  warnings: string[]
}
