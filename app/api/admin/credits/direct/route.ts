import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { listCreditsWithProfiles } from '@/lib/admin-credits'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const result = await listCreditsWithProfiles(auth.supabaseAdmin, 'credits')

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: result.data ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
