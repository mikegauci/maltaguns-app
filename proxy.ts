import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  redirectToLogin,
  addSecurityHeaders,
  isProtectedRoute,
  getUserProfile,
  isPrefetchRequest,
} from './middleware/utils'
import { isNonProductionHost } from '@/lib/seo-host'
import {
  getAdminSecurityStatus,
  getRequiredAdminSecurityRedirect,
} from '@/lib/admin-security'

function applyHostHeaders(req: NextRequest, res: NextResponse): NextResponse {
  if (isNonProductionHost(req.headers.get('host'))) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return res
}

function requestMayHaveSession(req: NextRequest): boolean {
  return req.cookies
    .getAll()
    .some(cookie => cookie.name.includes('-auth-token'))
}

async function signOutAndRedirectToLogin(
  req: NextRequest,
  errorMessage?: string
) {
  const redirectUrl = new URL('/login', req.url)
  redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
  if (errorMessage) {
    redirectUrl.searchParams.set('error', errorMessage)
  }

  const response = NextResponse.redirect(redirectUrl)
  const supabase = createMiddlewareClient(req, response)
  await supabase.auth.signOut()

  return applyHostHeaders(req, addSecurityHeaders(response))
}

export async function proxy(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname
    const isAdminRoute = pathname.startsWith('/admin')
    const needsAuth = isProtectedRoute(pathname) || isAdminRoute
    const isPrefetch = isPrefetchRequest(req)
    const mayHaveSession = requestMayHaveSession(req)

    if (!needsAuth && !isAdminRoute && !mayHaveSession) {
      return applyHostHeaders(req, NextResponse.next())
    }

    const res = NextResponse.next()
    const supabase = createMiddlewareClient(req, res)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (!needsAuth && !isAdminRoute) {
      return applyHostHeaders(req, res)
    }

    if (isPrefetch && !isAdminRoute) {
      return applyHostHeaders(req, res)
    }

    if (userError || !user) {
      return await signOutAndRedirectToLogin(req)
    }

    const profile = await getUserProfile(supabase, user.id)

    if (profile?.is_disabled) {
      return await signOutAndRedirectToLogin(
        req,
        'Your account has been disabled. Please contact support.'
      )
    }

    if (isAdminRoute) {
      if (!profile?.is_admin) {
        const response = NextResponse.redirect(new URL('/', req.url))
        return applyHostHeaders(req, addSecurityHeaders(response))
      }

      try {
        const status = await getAdminSecurityStatus(supabase, user.id)
        const redirectTo = getRequiredAdminSecurityRedirect(status, pathname)

        if (redirectTo) {
          const response = NextResponse.redirect(new URL(redirectTo, req.url))
          return applyHostHeaders(req, addSecurityHeaders(response))
        }
      } catch (error) {
        console.error('Admin security status check failed:', error)
        return await signOutAndRedirectToLogin(req)
      }
    }

    return applyHostHeaders(req, addSecurityHeaders(res))
  } catch (error) {
    console.error('Proxy error:', error)
    return applyHostHeaders(req, redirectToLogin(req))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
