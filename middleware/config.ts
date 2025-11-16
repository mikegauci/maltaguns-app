/**
 * Routes that require authentication
 */
export const PROTECTED_ROUTES = [
  '/profile',
  '/marketplace/create',
  '/events/create',
  '/events/edit',
  '/retailers/create',
  '/blog/create',
] as const

/**
 * Timeout for session operations (in milliseconds)
 */
export const SESSION_TIMEOUT = 5000 // 5 seconds

/**
 * Session refresh threshold (in minutes)
 */
export const SESSION_REFRESH_THRESHOLD = 5 // minutes

