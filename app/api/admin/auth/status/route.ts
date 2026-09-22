import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSecurityStatus } from '@/lib/admin-security'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireAdmin({ skipSecurityChecks: true })
  if ('error' in auth) return auth.error

  const supabase = await createClient()
  const status = await getAdminSecurityStatus(supabase, auth.user.id)

  return NextResponse.json(status)
}
