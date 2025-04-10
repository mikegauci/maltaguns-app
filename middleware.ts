import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { AuthResponse } from '@supabase/supabase-js'

const AUTHORIZED_ADMIN_EMAILS = [
  "etsy@motorelement.com",
  "info@maltaguns.com"
]

const PROTECTED_ROUTES = [
  '/profile',
  '/marketplace/create',
  '/events/create',
  '/events/edit',
  '/retailers/create',
  '/blog/create'
]

// Add timeout for session operations
const SESSION_TIMEOUT = 5000 // 5 seconds

export async function middleware(req: NextRequest) {
  try {
    // Special handling for Stripe webhook endpoints
    if (req.nextUrl.pathname.startsWith('/api/webhooks/stripe')) {
      console.log('[MIDDLEWARE] Detected Stripe webhook request, skipping auth check');
      return NextResponse.next({
        request: {
          headers: new Headers({
            'x-middleware-next': '1',
          }),
        },
      });
    }
    
    // Create a response early
    const res = NextResponse.next()
    
    // Create the Supabase client
    const supabase = createMiddlewareClient({ req, res })

    // Check if the path is protected
    const isProtectedRoute = PROTECTED_ROUTES.some(route => req.nextUrl.pathname.startsWith(route))
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

    if (!isProtectedRoute && !isAdminRoute) {
      return res
    }

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Session operation timed out')), SESSION_TIMEOUT)
    })

    // Try to get the session with timeout
    const sessionPromise = supabase.auth.getSession()
    let session
    
    try {
      const result = await Promise.race([sessionPromise, timeoutPromise]) as Awaited<typeof sessionPromise>
      session = result.data.session
    } catch (error) {
      console.error('Session operation timed out or failed:', error)
      // Clear any stale session data
      await supabase.auth.signOut()
      return redirectToLogin(req)
    }

    // If no session exists, redirect to login
    if (!session) {
      console.log('No session found, redirecting to login')
      return redirectToLogin(req)
    }

    // Validate session expiry
    const sessionExpiry = new Date(session.expires_at! * 1000)
    const now = new Date()
    const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
    const isNearExpiry = timeUntilExpiry < 5 * 60 * 1000 // 5 minutes

    if (isNearExpiry) {
      try {
        const refreshPromise = supabase.auth.refreshSession()
        const result = await Promise.race([refreshPromise, timeoutPromise]) as AuthResponse
        const { data: { session: refreshedSession }, error: refreshError } = result
        
        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed:', refreshError)
          // Clear any stale session data
          await supabase.auth.signOut()
          return redirectToLogin(req)
        }

        // Set the refreshed session
        await supabase.auth.setSession({
          access_token: refreshedSession.access_token,
          refresh_token: refreshedSession.refresh_token
        })
      } catch (error) {
        console.error('Error refreshing session:', error)
        // Clear any stale session data
        await supabase.auth.signOut()
        return redirectToLogin(req)
      }
    }

    // For admin routes, check authorization
    if (isAdminRoute) {
      const userEmail = session.user.email

      if (!userEmail || !AUTHORIZED_ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        console.log('User not authorized for admin:', userEmail)
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    // Add cache control headers to prevent stale session states
    res.headers.set('Cache-Control', 'no-store, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
    
    // Set session cookie and return response
    return res

  } catch (error) {
    console.error('Middleware error:', error)
    return redirectToLogin(req)
  }
}

// Helper function to handle login redirects
function redirectToLogin(req: NextRequest) {
  const redirectUrl = new URL('/login', req.url)
  redirectUrl.searchParams.set('redirectTo', req.url)
  // Add cache control headers to prevent redirect loops
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set('Cache-Control', 'no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
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
    '/api/webhooks/stripe'
  ],
} 