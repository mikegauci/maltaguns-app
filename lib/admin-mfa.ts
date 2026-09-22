import type { SupabaseClient } from '@supabase/supabase-js'

export type MfaFactors = NonNullable<
  Awaited<ReturnType<SupabaseClient['auth']['mfa']['listFactors']>>['data']
>

export function getVerifiedTotpFactors(factors: MfaFactors) {
  return factors.all.filter(
    factor => factor.factor_type === 'totp' && factor.status === 'verified'
  )
}

export function getUnverifiedTotpFactors(factors: MfaFactors) {
  return factors.all.filter(
    factor => factor.factor_type === 'totp' && factor.status !== 'verified'
  )
}

export async function unenrollUnverifiedTotpFactors(supabase: SupabaseClient) {
  const { data: factors, error } = await supabase.auth.mfa.listFactors()

  if (error) {
    return { error: error.message } as const
  }

  if (!factors) {
    return {} as const
  }

  for (const factor of getUnverifiedTotpFactors(factors)) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: factor.id,
    })

    if (unenrollError) {
      return { error: unenrollError.message } as const
    }
  }

  return {} as const
}
