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
import { isNonProductionHost } from '@/lib/seo-host'

function applyHostHeaders(req: NextRequest, res: NextResponse): NextResponse {
  if (isNonProductionHost(req.headers.get('host'))) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return res
}

export async function middleware(req: NextRequest) {
  try {
    const signOutAndRedirectToLogin = async (errorMessage?: string) => {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
      if (errorMessage) {
        redirectUrl.searchParams.set('error', errorMessage)
      }

      const response = NextResponse.redirect(redirectUrl)

      const supabase = createMiddlewareClient({ req, res: response })
      await supabase.auth.signOut()

      return applyHostHeaders(req, addSecurityHeaders(response))
    }

    if (req.nextUrl.pathname.startsWith('/api/webhooks/stripe')) {
      console.log(
        '[MIDDLEWARE] Detected Stripe webhook request, skipping auth check'
      )
      return applyHostHeaders(
        req,
        NextResponse.next({
          request: {
            headers: new Headers({
              'x-middleware-next': '1',
            }),
          },
        })
      )
    }

    const needsAuth = isProtectedRoute(req.nextUrl.pathname, PROTECTED_ROUTES)
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

    if (!needsAuth && !isAdminRoute) {
      return applyHostHeaders(req, NextResponse.next())
    }

    const purpose = req.headers.get('purpose') || req.headers.get('sec-purpose')
    const isPrefetch =
      purpose === 'prefetch' ||
      req.headers.get('x-middleware-prefetch') === '1' ||
      req.headers.get('next-router-prefetch') === '1'
    if (isPrefetch) {
      return applyHostHeaders(req, NextResponse.next())
    }

    const res = NextResponse.next()

    const supabase = createMiddlewareClient({ req, res })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log('No authenticated user found, redirecting to login')
      return await signOutAndRedirectToLogin()
    }

    if (isAdminRoute) {
      const profile = await getUserProfile(supabase, user.id)
      if (!profile?.is_admin) {
        console.log('User not authorized for admin:', user.email)
        const response = NextResponse.redirect(new URL('/', req.url))
        return applyHostHeaders(req, addSecurityHeaders(response))
      }
    }

    return applyHostHeaders(req, addSecurityHeaders(res))
  } catch (error) {
    console.error('Middleware error:', error)
    return applyHostHeaders(req, redirectToLogin(req))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    '/api/webhooks/stripe',
  ],
}
