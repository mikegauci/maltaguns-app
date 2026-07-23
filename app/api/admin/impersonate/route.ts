import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'
import {
  clearImpersonationCookie,
  getImpersonationState,
  setImpersonationCookie,
} from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { user: adminUser, supabaseAdmin } = auth

  const existing = await getImpersonationState()
  if (existing) {
    return NextResponse.json(
      { error: 'Already impersonating a user' },
      { status: 400 }
    )
  }

  let body: { userId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const userId = body.userId
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  if (userId === adminUser.id) {
    return NextResponse.json(
      { error: 'Cannot impersonate yourself' },
      { status: 400 }
    )
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, email, is_admin, is_disabled')
    .eq('id', userId)
    .single()

  if (targetError || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (target.is_admin) {
    return NextResponse.json(
      { error: 'Cannot impersonate another admin' },
      { status: 403 }
    )
  }

  if (target.is_disabled) {
    return NextResponse.json(
      { error: 'Cannot impersonate a disabled user' },
      { status: 403 }
    )
  }

  if (!target.email) {
    return NextResponse.json(
      { error: 'Target user has no email' },
      { status: 400 }
    )
  }

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('id', adminUser.id)
    .single()

  const supabase = await createClient()
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.refresh_token) {
    return NextResponse.json(
      { error: 'Failed to get admin session' },
      { status: 500 }
    )
  }

  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: target.email,
    })

  if (linkError || !linkData.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message || 'Failed to generate impersonation link' },
      { status: 500 }
    )
  }

  await setImpersonationCookie({
    adminId: adminUser.id,
    adminUsername: adminProfile?.username || adminUser.email || 'Admin',
    targetId: target.id,
    targetUsername: target.username,
    adminRefreshToken: sessionData.session.refresh_token,
  })

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  })

  if (verifyError) {
    await clearImpersonationCookie()
    return NextResponse.json({ error: verifyError.message }, { status: 500 })
  }

  const { error: auditError } = await supabaseAdmin
    .from('admin_impersonation_logs')
    .insert({
      admin_id: adminUser.id,
      target_id: target.id,
      action: 'start',
    })

  if (auditError) {
    console.error('Failed to log impersonation start:', auditError)
  }

  return NextResponse.json({ success: true })
}
