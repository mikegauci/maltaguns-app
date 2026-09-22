import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { User } from '@supabase/supabase-js'
import { getVerifiedTotpFactors } from '@/lib/admin-mfa'

type RequireAdminOptions = {
  skipSecurityChecks?: boolean
}

type RequireAdminSuccess = {
  user: User
  supabaseAdmin: typeof supabaseAdmin
}

type RequireAdminFailure = {
  error: NextResponse
}

export async function requireAdmin(
  options?: RequireAdminOptions
): Promise<RequireAdminSuccess | RequireAdminFailure> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      ),
    }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, must_change_password')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - Admin privileges required' },
        { status: 403 }
      ),
    }
  }

  if (!options?.skipSecurityChecks) {
    if (profile.must_change_password) {
      return {
        error: NextResponse.json(
          {
            error: 'Password change required',
            code: 'PASSWORD_CHANGE_REQUIRED',
          },
          { status: 403 }
        ),
      }
    }

    const { data: factors, error: factorsError } =
      await supabase.auth.mfa.listFactors()

    if (factorsError) {
      return {
        error: NextResponse.json(
          { error: 'Failed to verify MFA status' },
          { status: 500 }
        ),
      }
    }

    const verifiedTotpFactors = factors ? getVerifiedTotpFactors(factors) : []

    if (verifiedTotpFactors.length === 0) {
      return {
        error: NextResponse.json(
          {
            error: 'MFA enrollment required',
            code: 'MFA_ENROLLMENT_REQUIRED',
          },
          { status: 403 }
        ),
      }
    }

    const { data: aalData, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalError) {
      return {
        error: NextResponse.json(
          { error: 'Failed to verify MFA assurance level' },
          { status: 500 }
        ),
      }
    }

    if (aalData.currentLevel !== 'aal2') {
      return {
        error: NextResponse.json(
          { error: 'MFA verification required', code: 'MFA_REQUIRED' },
          { status: 403 }
        ),
      }
    }
  }

  return { user, supabaseAdmin }
}

export async function requireAuthenticatedUser(): Promise<
  { user: User } | RequireAdminFailure
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      ),
    }
  }

  return { user }
}
