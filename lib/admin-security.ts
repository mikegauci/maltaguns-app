import type { SupabaseClient } from '@supabase/supabase-js'
import { getVerifiedTotpFactors } from '@/lib/admin-mfa'

export const ADMIN_SECURITY_ROUTES = {
  changePassword: '/admin/security/change-password',
  mfaEnroll: '/admin/security/mfa',
  mfaVerify: '/admin/security/mfa/verify',
  settings: '/admin/security',
} as const

export const ADMIN_SECURITY_BYPASS_PREFIXES = ['/admin/security'] as const

export type AdminSecurityStatus = {
  mustChangePassword: boolean
  mfaEnrolled: boolean
  aal2: boolean
}

export function isAdminSecurityBypassRoute(pathname: string): boolean {
  return ADMIN_SECURITY_BYPASS_PREFIXES.some(prefix =>
    pathname.startsWith(prefix)
  )
}

export function getRequiredAdminSecurityRedirect(
  status: AdminSecurityStatus,
  pathname: string
): string | null {
  if (isAdminSecurityBypassRoute(pathname)) {
    if (status.mustChangePassword) {
      if (pathname.startsWith(ADMIN_SECURITY_ROUTES.changePassword)) {
        return null
      }
      return ADMIN_SECURITY_ROUTES.changePassword
    }

    if (!status.mfaEnrolled) {
      if (pathname.startsWith(ADMIN_SECURITY_ROUTES.mfaEnroll)) {
        return null
      }
      return ADMIN_SECURITY_ROUTES.mfaEnroll
    }

    if (!status.aal2) {
      if (pathname.startsWith(ADMIN_SECURITY_ROUTES.mfaVerify)) {
        return null
      }
      return ADMIN_SECURITY_ROUTES.mfaVerify
    }

    return null
  }

  if (status.mustChangePassword) {
    return ADMIN_SECURITY_ROUTES.changePassword
  }

  if (!status.mfaEnrolled) {
    return ADMIN_SECURITY_ROUTES.mfaEnroll
  }

  if (!status.aal2) {
    return ADMIN_SECURITY_ROUTES.mfaVerify
  }

  return null
}

export async function getAdminSecurityStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminSecurityStatus> {
  const [{ data: profile, error: profileError }, aalResult, factorsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', userId)
        .single(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ])

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (aalResult.error) {
    throw new Error(aalResult.error.message)
  }

  if (factorsResult.error) {
    throw new Error(factorsResult.error.message)
  }

  const verifiedTotpFactors = factorsResult.data
    ? getVerifiedTotpFactors(factorsResult.data)
    : []

  return {
    mustChangePassword: profile?.must_change_password ?? false,
    mfaEnrolled: verifiedTotpFactors.length > 0,
    aal2: aalResult.data?.currentLevel === 'aal2',
  }
}

type AmrEntry = { method?: string; timestamp?: number }

export function isRecoverySession(accessToken: string): boolean {
  try {
    const payloadSegment = accessToken.split('.')[1]
    if (!payloadSegment) return false

    const payload = JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8')
    ) as { amr?: AmrEntry[] }

    return payload.amr?.some(entry => entry.method === 'recovery') ?? false
  } catch {
    return false
  }
}
