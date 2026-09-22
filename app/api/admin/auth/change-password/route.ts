import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import { changeAdminPassword } from '@/lib/admin-password-change'
import {
  ADMIN_SECURITY_ROUTES,
  getAdminSecurityStatus,
} from '@/lib/admin-security'

export async function POST(request: Request) {
  const auth = await requireAdmin({ skipSecurityChecks: true })
  if ('error' in auth) return auth.error

  const { user } = auth

  let body: {
    password?: string
    currentPassword?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const password = body.password?.trim()
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  if (!user.email) {
    return NextResponse.json(
      { error: 'Account email is required to change password' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const result = await changeAdminPassword({
    supabase,
    userId: user.id,
    email: user.email,
    password,
    currentPassword: body.currentPassword,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const status = await getAdminSecurityStatus(supabase, user.id)
  let nextStep: string = ADMIN_SECURITY_ROUTES.mfaEnroll

  if (status.mfaEnrolled && !status.aal2) {
    nextStep = ADMIN_SECURITY_ROUTES.mfaVerify
  } else if (status.mfaEnrolled && status.aal2) {
    nextStep = '/admin'
  }

  return NextResponse.json({ success: true, nextStep })
}
