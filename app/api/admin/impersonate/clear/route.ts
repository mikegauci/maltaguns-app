import { NextResponse } from 'next/server'
import { clearImpersonationCookie } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

export async function POST() {
  await clearImpersonationCookie()
  return NextResponse.json({ success: true })
}
