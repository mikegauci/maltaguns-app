import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTHORIZED_ADMIN_EMAILS = [
  "etsy@motorelement.com",
  "info@maltaguns.com"
]

const PROTECTED_ROUTES = [
  '/profile',
  '/marketplace/create',
  '/events/create',
  '/retailers/create',
  '/blog/create'
]

export async function middleware(req: NextRequest) {
  try {
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

    // Try to get the session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    // Handle session error
    if (sessionError) {
      console.error('Session error:', sessionError)
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
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed:', refreshError)
          return redirectToLogin(req)
        }

        // Set the refreshed session
        await supabase.auth.setSession({
          access_token: refreshedSession.access_token,
          refresh_token: refreshedSession.refresh_token
        })
      } catch (error) {
        console.error('Error refreshing session:', error)
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
  return NextResponse.redirect(redirectUrl)
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
  ],
} 