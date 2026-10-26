import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import {
  listAdminAuditActions,
  listAdminAuditLog,
} from '@/lib/armory/admin-queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const sp = req.nextUrl.searchParams
    const dealerAccountId = sp.get('dealerAccountId') ?? undefined
    const action = sp.get('action') ?? undefined
    const q = sp.get('q') ?? undefined

    const [rows, actions] = await Promise.all([
      listAdminAuditLog({ dealerAccountId, action, q }),
      listAdminAuditActions(),
    ])

    return NextResponse.json({ rows, actions })
  } catch (error) {
    console.error('Error fetching armory audit log:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
