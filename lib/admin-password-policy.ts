import * as z from 'zod'

export const ADMIN_PASSWORD_MIN_LENGTH = 12

export const adminPasswordSchema = z
  .string()
  .min(
    ADMIN_PASSWORD_MIN_LENGTH,
    `Password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`
  )
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const adminPasswordWithConfirmSchema = z
  .object({
    password: adminPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type AdminPasswordValidationResult =
  | { valid: true }
  | { valid: false; error: string }

export function validateAdminPassword(
  password: string
): AdminPasswordValidationResult {
  const result = adminPasswordSchema.safeParse(password)
  if (result.success) {
    return { valid: true }
  }

  return {
    valid: false,
    error: result.error.errors[0]?.message ?? 'Invalid password',
  }
}

const PASSWORD_LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'
const PASSWORD_DIGITS = '23456789'
const PASSWORD_CHARS = `${PASSWORD_LETTERS}${PASSWORD_DIGITS}`

function randomIndex(max: number): number {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] % max
}

function shuffleChars(values: string[]): string[] {
  const shuffled = [...values]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function generateAdminPassword(
  length: number = ADMIN_PASSWORD_MIN_LENGTH + 4
): string {
  const targetLength = Math.max(length, ADMIN_PASSWORD_MIN_LENGTH)
  const chars = [
    PASSWORD_LETTERS[randomIndex(PASSWORD_LETTERS.length)],
    PASSWORD_DIGITS[randomIndex(PASSWORD_DIGITS.length)],
  ]

  while (chars.length < targetLength) {
    chars.push(PASSWORD_CHARS[randomIndex(PASSWORD_CHARS.length)])
  }

  return shuffleChars(chars).join('')
}
