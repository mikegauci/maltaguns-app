import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PROTECTED_ROUTES } from './middleware/config'
import {
  redirectToLogin,
  addSecurityHeaders,
  isProtectedRoute,
  getUserProfile,
} from './middleware/utils'
import { getValidSession, refreshSessionIfNeeded } from './middleware/auth'

export async function middleware(req: NextRequest) {
  try {
    // Special handling for Stripe webhook endpoints
    if (req.nextUrl.pathname.startsWith('/api/webhooks/stripe')) {
      console.log(
        '[MIDDLEWARE] Detected Stripe webhook request, skipping auth check'
      )
      return NextResponse.next({
        request: {
          headers: new Headers({
            'x-middleware-next': '1',
          }),
        },
      })
    }

    // Create a response early
    const res = NextResponse.next()

    // Create the Supabase client
    const supabase = createMiddlewareClient({ req, res })

    // Check if the path requires protection
    const needsAuth = isProtectedRoute(req.nextUrl.pathname, PROTECTED_ROUTES)
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

    // If route doesn't need auth, return early
    if (!needsAuth && !isAdminRoute) {
      return res
    }

    // Get and validate session with timeout
    const session = await getValidSession(supabase)

    // If no session exists, redirect to login
    if (!session) {
      console.log('No session found, redirecting to login')
      return redirectToLogin(req)
    }

    // Refresh session if near expiry
    const refreshSuccess = await refreshSessionIfNeeded(
      supabase,
      session.expires_at
    )

    if (!refreshSuccess) {
      console.log('Session refresh failed, redirecting to login')
      return redirectToLogin(req)
    }

    // Fetch user profile once for both admin and disabled checks
    const profile = await getUserProfile(supabase, session.user.id)

    // Check if user is disabled first (before admin check)
    if (profile?.is_disabled) {
      console.log('User account is disabled:', session.user.email)
      await supabase.auth.signOut()

      return redirectToLogin(
        req,
        'Your account has been disabled. Please contact support.'
      )
    }

    // For admin routes, check authorization
    if (isAdminRoute) {
      if (!profile?.is_admin) {
        console.log('User not authorized for admin:', session.user.email)
        const response = NextResponse.redirect(new URL('/', req.url))
        return addSecurityHeaders(response)
      }
    }

    // Add security headers and return
    return addSecurityHeaders(res)
  } catch (error) {
    console.error('Middleware error:', error)
    return redirectToLogin(req)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    '/api/webhooks/stripe',
  ],
}
