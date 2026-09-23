import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { supabaseAdmin } = auth
  const { count, error } = await supabaseAdmin
    .from('armory_dealer_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('account_status', 'pending')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    armoryDealersPending: count ?? 0,
  })
}
