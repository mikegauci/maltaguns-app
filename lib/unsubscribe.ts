import crypto from 'crypto'

function getSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error('Missing SUPABASE_JWT_SECRET for unsubscribe token signing')
  }
  return secret
}

export function signUnsubscribeToken(userId: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`article:${userId}`)
    .digest('hex')
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  if (!userId || !token) return false

  const expected = signUnsubscribeToken(userId)
  const expectedBuf = Buffer.from(expected, 'hex')
  let providedBuf: Buffer
  try {
    providedBuf = Buffer.from(token, 'hex')
  } catch {
    return false
  }

  if (expectedBuf.length !== providedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}
