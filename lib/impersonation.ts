import { cookies } from 'next/headers'

export const IMPERSONATION_COOKIE_NAME = 'mg_impersonation'
export const IMPERSONATION_COOKIE_MAX_AGE = 60 * 60 * 8

export type ImpersonationState = {
  adminId: string
  adminUsername: string
  targetId: string
  targetUsername: string
  adminRefreshToken: string
}

function isImpersonationState(value: unknown): value is ImpersonationState {
  if (!value || typeof value !== 'object') return false

  const state = value as Record<string, unknown>
  return (
    typeof state.adminId === 'string' &&
    typeof state.adminUsername === 'string' &&
    typeof state.targetId === 'string' &&
    typeof state.targetUsername === 'string' &&
    typeof state.adminRefreshToken === 'string' &&
    state.adminRefreshToken.length > 0
  )
}

export async function getImpersonationState(): Promise<ImpersonationState | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(IMPERSONATION_COOKIE_NAME)
  if (!cookie?.value) return null

  try {
    const parsed: unknown = JSON.parse(cookie.value)
    if (!isImpersonationState(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export async function setImpersonationCookie(
  state: ImpersonationState
): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATION_COOKIE_NAME, JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: IMPERSONATION_COOKIE_MAX_AGE,
  })
}

export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATION_COOKIE_NAME)
}
