import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  clearImpersonationCookie,
  getImpersonationState,
} from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

export async function POST() {
  const state = await getImpersonationState()
  if (!state) {
    return NextResponse.json({ error: 'Not impersonating' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.refreshSession({
    refresh_token: state.adminRefreshToken,
  })

  if (error) {
    return NextResponse.json(
      {
        error:
          'Failed to restore admin session. Try again, or log in as your admin account.',
      },
      { status: 500 }
    )
  }

  const { error: auditError } = await supabaseAdmin
    .from('admin_impersonation_logs')
    .insert({
      admin_id: state.adminId,
      target_id: state.targetId,
      action: 'stop',
    })

  if (auditError) {
    console.error('Failed to log impersonation stop:', auditError)
  }

  await clearImpersonationCookie()

  return NextResponse.json({ success: true })
}
