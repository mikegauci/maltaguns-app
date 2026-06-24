import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { signUnsubscribeToken } from '@/lib/unsubscribe'

type PendingNotification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  link_url: string | null
  created_at: string
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addUtcDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime())
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getCronSecret(req: NextRequest): string | null {
  return req.headers.get('x-cron-secret')
}

function getAuthBearer(req: NextRequest): string | null {
  const value = req.headers.get('authorization')
  if (!value) return null
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

function isAuthorizedCron(req: NextRequest): boolean {
  const expected = process.env.NOTIFICATIONS_CRON_SECRET
  if (!expected) return true

  const viaHeader = getCronSecret(req)
  if (viaHeader && viaHeader === expected) return true

  const viaBearer = getAuthBearer(req)
  if (viaBearer && viaBearer === expected) return true

  return false
}

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing env.RESEND_API_KEY')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

function getSiteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://maltaguns.com'
  return raw.replace(/\/$/, '')
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  const base = getSiteBaseUrl()
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

function getUnsubscribeUrl(userId: string): string {
  const token = signUnsubscribeToken(userId)
  return `${getSiteBaseUrl()}/api/unsubscribe?u=${encodeURIComponent(
    userId
  )}&t=${token}`
}

function notificationEmailHtml(
  n: PendingNotification,
  unsubscribeUrl?: string
): string {
  const absoluteUrl = n.link_url ? toAbsoluteUrl(n.link_url) : ''
  const link = absoluteUrl
    ? `<p><a href="${absoluteUrl}">${absoluteUrl}</a></p>`
    : ''
  const unsubscribe = unsubscribeUrl
    ? `<p style="color: #999; font-size: 12px; margin: 8px 0 0 0;">Don't want these emails? <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe from new article emails</a>. You'll still see them in your on-site notifications.</p>`
    : ''
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111; margin: 0 0 12px 0;">${n.title}</h2>
      <p style="color: #333; margin: 0 0 12px 0;">${n.body}</p>
      ${link}
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e5e5;">
      <p style="color: #666; font-size: 12px; margin: 0;">MaltaGuns notification</p>
      ${unsubscribe}
    </div>
  `
}

async function createTimeBasedNotifications(): Promise<{
  listingExpiring: number
  listingExpired: number
  licenseExpiring: number
}> {
  const now = new Date()
  const todayUtc = startOfUtcDay(now)
  const start7 = addUtcDays(todayUtc, 7)
  const start8 = addUtcDays(todayUtc, 8)
  const targetDateStr = isoDate(start7)

  const [expiringListingsRes, expiredListingsRes, expiringLicensesRes] =
    await Promise.all([
      supabaseAdmin
        .from('listings')
        .select('id, seller_id, title, expires_at')
        .eq('status', 'active')
        .gte('expires_at', start7.toISOString())
        .lt('expires_at', start8.toISOString())
        .limit(500),
      supabaseAdmin
        .from('listings')
        .select('id, seller_id, title, expires_at')
        .eq('status', 'active')
        .lt('expires_at', now.toISOString())
        .limit(500),
      supabaseAdmin
        .from('profiles')
        .select('id, license_expiry_date')
        .eq('license_expiry_date', targetDateStr)
        .limit(1000),
    ])

  if (expiringListingsRes.error) throw expiringListingsRes.error
  if (expiredListingsRes.error) throw expiredListingsRes.error
  if (expiringLicensesRes.error) throw expiringLicensesRes.error

  const expiringListings = expiringListingsRes.data || []
  const expiredListings = expiredListingsRes.data || []
  const expiringLicenses = expiringLicensesRes.data || []

  const notificationRows: Array<{
    user_id: string
    type: string
    title: string
    body: string
    link_url: string | null
    dedupe_key: string
    email_status?: string
  }> = []

  for (const listing of expiringListings) {
    const expiresAt = listing.expires_at ? new Date(listing.expires_at) : null
    const expiresOn = expiresAt ? expiresAt.toISOString().slice(0, 10) : 'soon'
    notificationRows.push({
      user_id: listing.seller_id,
      type: 'listing_expiring',
      title: 'Listing expiring in 7 days',
      body: `${listing.title} expires on ${expiresOn}.`,
      link_url: '/profile',
      dedupe_key: `listing_expiring:${listing.id}:7d`,
    })
  }

  for (const listing of expiredListings) {
    notificationRows.push({
      user_id: listing.seller_id,
      type: 'listing_expired',
      title: 'Listing expired',
      body: `${listing.title} has expired.`,
      link_url: '/profile',
      dedupe_key: `listing_expired:${listing.id}`,
    })
  }

  for (const p of expiringLicenses) {
    notificationRows.push({
      user_id: p.id,
      type: 'license_expiring',
      title: 'Firearms license expiring in 7 days',
      body: `Your firearms license expires on ${targetDateStr}.`,
      link_url: '/profile',
      dedupe_key: `license_expiring:${p.id}:${targetDateStr}`,
    })
  }

  if (notificationRows.length > 0) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .upsert(notificationRows, {
        onConflict: 'user_id,dedupe_key',
        ignoreDuplicates: true,
      })
    if (error) throw error
  }

  return {
    listingExpiring: expiringListings.length,
    listingExpired: expiredListings.length,
    licenseExpiring: expiringLicenses.length,
  }
}

async function sendPendingEmails(): Promise<{
  attempted: number
  sent: number
  failed: number
}> {
  const { data: pending, error: pendingErr } = await supabaseAdmin
    .from('notifications')
    .select('id, user_id, type, title, body, link_url, created_at')
    .eq('email_status', 'pending')
    .is('email_sent_at', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (pendingErr) throw pendingErr
  const pendingNotifications = (pending || []) as PendingNotification[]

  if (pendingNotifications.length === 0) {
    return { attempted: 0, sent: 0, failed: 0 }
  }

  const userIds = Array.from(new Set(pendingNotifications.map(n => n.user_id)))
  const { data: profiles, error: profilesErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, article_email_opt_out')
    .in('id', userIds)

  if (profilesErr) throw profilesErr

  const emailByUserId = new Map<string, string>()
  const articleOptOutUserIds = new Set<string>()
  for (const p of profiles || []) {
    if (p.email) emailByUserId.set(p.id, p.email)
    if (p.article_email_opt_out) articleOptOutUserIds.add(p.id)
  }

  const resend = getResend()
  let sent = 0
  let failed = 0

  for (const n of pendingNotifications) {
    if (n.type === 'article_new' && articleOptOutUserIds.has(n.user_id)) {
      await supabaseAdmin
        .from('notifications')
        .update({
          email_status: 'skipped',
          email_error: null,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', n.id)
      continue
    }

    const to = emailByUserId.get(n.user_id)
    if (!to) {
      failed++
      await supabaseAdmin
        .from('notifications')
        .update({
          email_status: 'failed',
          email_error: 'No email on profile',
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', n.id)
      continue
    }

    const unsubscribeUrl =
      n.type === 'article_new' ? getUnsubscribeUrl(n.user_id) : undefined

    const { error } = await resend.emails.send({
      from: 'MaltaGuns <contact@maltaguns.com>',
      to: [to],
      subject: n.title,
      html: notificationEmailHtml(n, unsubscribeUrl),
      ...(unsubscribeUrl
        ? {
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }
        : {}),
    })

    if (error) {
      failed++
      await supabaseAdmin
        .from('notifications')
        .update({
          email_status: 'failed',
          email_error: error.message ?? 'Resend error',
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', n.id)
      continue
    }

    sent++
    await supabaseAdmin
      .from('notifications')
      .update({
        email_status: 'sent',
        email_error: null,
        email_sent_at: new Date().toISOString(),
      })
      .eq('id', n.id)
  }

  return { attempted: pendingNotifications.length, sent, failed }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const created = await createTimeBasedNotifications()
    const emailed = await sendPendingEmails()

    return NextResponse.json({ ok: true, created, emailed }, { status: 200 })
  } catch (error) {
    console.error('Cron notifications error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron triggers use GET requests; reuse the same logic.
  return POST(req)
}
