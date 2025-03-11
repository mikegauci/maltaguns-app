import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTHORIZED_ADMIN_EMAILS = [
  "etsy@motorelement.com",
  "info@maltaguns.com"
]

export async function middleware(req: NextRequest) {
  // Only run on admin routes
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    console.log('Checking admin access for:', req.nextUrl.pathname)

    // Refresh the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    console.log('Session check result:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      error: sessionError?.message
    })

    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.redirect(new URL('/login', req.url))
    }

    if (!session) {
      console.log('No session found, redirecting to login')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const userEmail = session.user.email
    console.log('Checking authorization for email:', userEmail)
    console.log('Authorized emails:', AUTHORIZED_ADMIN_EMAILS)

    if (!userEmail || !AUTHORIZED_ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      console.log('User not authorized:', userEmail)
      return NextResponse.redirect(new URL('/', req.url))
    }

    console.log('User authorized, proceeding to admin panel')
    return res

  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: ['/admin/:path*']
} 