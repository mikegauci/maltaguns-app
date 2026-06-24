import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'

function getSiteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://maltaguns.com'
  return raw.replace(/\/$/, '')
}

// Sets the article email opt-out for the given user. Returns true on success.
async function applyOptOut(userId: string, token: string): Promise<boolean> {
  if (!verifyUnsubscribeToken(userId, token)) return false

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ article_email_opt_out: true })
    .eq('id', userId)

  return !error
}

// Email link click: opt the user out, then show a friendly confirmation page.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('u') || ''
  const token = req.nextUrl.searchParams.get('t') || ''

  const ok = await applyOptOut(userId, token)
  const status = ok ? 'ok' : 'invalid'
  return NextResponse.redirect(
    `${getSiteBaseUrl()}/unsubscribe?status=${status}`
  )
}

// One-click unsubscribe (RFC 8058) sent by some mail clients as a POST.
export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('u') || ''
  const token = req.nextUrl.searchParams.get('t') || ''

  const ok = await applyOptOut(userId, token)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
  return NextResponse.json({ ok: true }, { status: 200 })
}
