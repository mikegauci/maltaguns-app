import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const scryptAsync = promisify(scrypt)
const PASSWORD_HISTORY_LIMIT = 4
const SCRYPT_KEY_LENGTH = 64

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  return scryptAsync(password, salt, SCRYPT_KEY_LENGTH).then(
    derivedKey => `scrypt:${salt}:${(derivedKey as Buffer).toString('hex')}`
  )
}

async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false
  }

  const [, salt, hashHex] = parts
  const derivedKey = (await scryptAsync(
    password,
    salt,
    SCRYPT_KEY_LENGTH
  )) as Buffer
  const storedKey = Buffer.from(hashHex, 'hex')

  if (derivedKey.length !== storedKey.length) {
    return false
  }

  return timingSafeEqual(derivedKey, storedKey)
}

export async function assertPasswordNotReused(
  userId: string,
  plainPassword: string
): Promise<void> {
  const { data: history, error } = await supabaseAdmin
    .from('admin_password_history')
    .select('password_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(PASSWORD_HISTORY_LIMIT)

  if (error) {
    throw new Error(`Failed to check password history: ${error.message}`)
  }

  for (const entry of history ?? []) {
    const matches = await verifyPassword(plainPassword, entry.password_hash)
    if (matches) {
      throw new Error('Password cannot match any of your last 4 passwords')
    }
  }
}

export async function recordPasswordHistory(
  userId: string,
  plainPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(plainPassword)

  const { error: insertError } = await supabaseAdmin
    .from('admin_password_history')
    .insert({ user_id: userId, password_hash: passwordHash })

  if (insertError) {
    throw new Error(`Failed to record password history: ${insertError.message}`)
  }

  const { data: entries, error: listError } = await supabaseAdmin
    .from('admin_password_history')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (listError) {
    throw new Error(`Failed to prune password history: ${listError.message}`)
  }

  const staleIds = (entries ?? [])
    .slice(PASSWORD_HISTORY_LIMIT)
    .map(entry => entry.id)

  if (staleIds.length === 0) {
    return
  }

  const { error: deleteError } = await supabaseAdmin
    .from('admin_password_history')
    .delete()
    .in('id', staleIds)

  if (deleteError) {
    throw new Error(`Failed to prune password history: ${deleteError.message}`)
  }
}

export async function removeLatestPasswordHistory(
  userId: string
): Promise<void> {
  const { data: latest, error } = await supabaseAdmin
    .from('admin_password_history')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to roll back password history: ${error.message}`)
  }

  if (!latest) {
    return
  }

  const { error: deleteError } = await supabaseAdmin
    .from('admin_password_history')
    .delete()
    .eq('id', latest.id)

  if (deleteError) {
    throw new Error(
      `Failed to roll back password history: ${deleteError.message}`
    )
  }
}
