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

export async function middleware(req: NextRequest) {
  try {
    const signOutAndRedirectToLogin = async (errorMessage?: string) => {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
      if (errorMessage) {
        redirectUrl.searchParams.set('error', errorMessage)
      }

      const response = NextResponse.redirect(redirectUrl)

      // Bind the Supabase middleware client to the SAME response we return, otherwise any
      // Set-Cookie headers from signOut() are lost and the browser keeps sending stale tokens.
      const supabase = createMiddlewareClient({ req, res: response })
      await supabase.auth.signOut()

      return addSecurityHeaders(response)
    }

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

    // Check if the path requires protection
    const needsAuth = isProtectedRoute(req.nextUrl.pathname, PROTECTED_ROUTES)
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

    // If route doesn't need auth, return early
    if (!needsAuth && !isAdminRoute) {
      return NextResponse.next()
    }

    // Skip expensive auth/session work for Next.js prefetch requests. These can happen
    // immediately on page load due to `next/link` prefetching protected routes.
    const purpose = req.headers.get('purpose') || req.headers.get('sec-purpose')
    const isPrefetch =
      purpose === 'prefetch' ||
      req.headers.get('x-middleware-prefetch') === '1' ||
      req.headers.get('next-router-prefetch') === '1'
    if (isPrefetch) {
      // Important: do NOT redirect prefetch/RSC requests. It can cause dev-time errors like
      // "ReadableStream is already closed" and surface as a 404. Just skip auth work.
      return NextResponse.next()
    }

    // Create a response early
    const res = NextResponse.next()

    // Create the Supabase client (only for routes that need auth/admin)
    const supabase = createMiddlewareClient({ req, res })

    // Fetch session (Supabase may refresh internally if needed)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If no session exists, redirect to login
    if (!session) {
      console.log('No session found, redirecting to login')
      return await signOutAndRedirectToLogin()
    }

    // For admin routes, check authorization
    if (isAdminRoute) {
      const profile = await getUserProfile(supabase, session.user.id)
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
