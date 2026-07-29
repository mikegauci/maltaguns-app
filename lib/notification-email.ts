import { Resend } from 'resend'
import { escapeHtml } from '@/lib/escape-html'

export type NotificationEmailPayload = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  link_url: string | null
  created_at: string
}

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing env.RESEND_API_KEY')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export function getSiteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://maltaguns.com'
  return raw.replace(/\/$/, '')
}

export function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  const base = getSiteBaseUrl()
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

export function ctaLabelForType(type: string): string {
  switch (type) {
    case 'article_new':
      return 'Read article'
    case 'listing_created':
    case 'listing_expiring':
    case 'listing_expired':
      return 'View listing'
    case 'license_expiring':
    case 'license_approved':
    case 'id_card_approved':
    case 'establishment_rejected':
      return 'Go to profile'
    case 'establishment_approved':
      return 'View establishment'
    default:
      return 'View'
  }
}

export function notificationEmailHtml(
  n: NotificationEmailPayload,
  unsubscribeUrl?: string
): string {
  const base = getSiteBaseUrl()
  const logoUrl = `${base}/maltaguns.png`
  const absoluteUrl = n.link_url ? toAbsoluteUrl(n.link_url) : ''
  const title = escapeHtml(n.title)
  const body = escapeHtml(n.body)

  const button = absoluteUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: #171717;">
            <a href="${absoluteUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; line-height: 1; color: #ffffff; text-decoration: none; border-radius: 8px;">${ctaLabelForType(
              n.type
            )}</a>
          </td>
        </tr>
      </table>`
    : ''

  const unsubscribe = unsubscribeUrl
    ? `<p style="margin: 12px 0 0; font-size: 12px; line-height: 1.5; color: #a1a1aa;">Don't want these emails? <a href="${unsubscribeUrl}" target="_blank" style="color: #a1a1aa; text-decoration: underline;">Unsubscribe from new article emails</a>. You'll still see them in your on-site notifications.</p>`
    : ''

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light only" />
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <tr>
                <td align="center" style="padding: 28px 32px 24px; border-bottom: 3px solid #c8102e;">
                  <img src="${logoUrl}" alt="MaltaGuns" width="180" style="display: block; width: 180px; max-width: 60%; height: auto;" />
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h1 style="margin: 0 0 12px; font-size: 20px; line-height: 1.3; color: #171717;">${title}</h1>
                  <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">${body}</p>
                  ${button}
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 32px 28px; border-top: 1px solid #e4e4e7; background-color: #fafafa;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #71717a;">You're receiving this email from <a href="${base}" target="_blank" style="color: #71717a; text-decoration: underline;">MaltaGuns</a>, Malta's firearms community.</p>
                  ${unsubscribe}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}

export async function sendNotificationEmail({
  notification,
  to,
  unsubscribeUrl,
}: {
  notification: NotificationEmailPayload
  to: string
  unsubscribeUrl?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const resend = getResend()

  const { error } = await resend.emails.send({
    from: 'MaltaGuns <noreply@maltaguns.com>',
    to: [to],
    subject: notification.title,
    html: notificationEmailHtml(notification, unsubscribeUrl),
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
    return { success: false, error: error.message ?? 'Resend error' }
  }

  return { success: true }
}
