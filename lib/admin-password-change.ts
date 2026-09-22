import type { SupabaseClient } from '@supabase/supabase-js'
import { validateAdminPassword } from '@/lib/admin-password-policy'
import {
  assertPasswordNotReused,
  recordPasswordHistory,
  removeLatestPasswordHistory,
} from '@/lib/admin-password-history'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isRecoverySession } from '@/lib/admin-security'

export type AdminPasswordChangeResult =
  | { success: true }
  | { success: false; error: string; status: number }

function isInvalidCredentialsError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password')
  )
}

async function assertPasswordDifferentFromCurrent(
  supabase: SupabaseClient,
  email: string,
  newPassword: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: newPassword,
  })

  if (!error) {
    throw new Error('New password must be different from your current password')
  }

  if (!isInvalidCredentialsError(error.message)) {
    throw new Error('Unable to validate password change. Please try again.')
  }
}

export async function changeAdminPassword(params: {
  supabase: SupabaseClient
  userId: string
  email: string
  password: string
  currentPassword?: string
}): Promise<AdminPasswordChangeResult> {
  const password = params.password.trim()

  const validation = validateAdminPassword(password)
  if (!validation.valid) {
    return { success: false, error: validation.error, status: 400 }
  }

  const {
    data: { user },
    error: userError,
  } = await params.supabase.auth.getUser()

  if (userError || !user || user.id !== params.userId) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('must_change_password')
    .eq('id', params.userId)
    .single()

  if (profileError) {
    return {
      success: false,
      error: 'Failed to load profile',
      status: 500,
    }
  }

  const { data: sessionData } = await params.supabase.auth.getSession()
  const isRecovery = sessionData.session?.access_token
    ? isRecoverySession(sessionData.session.access_token)
    : false

  const forcedChange = (profile?.must_change_password ?? false) || isRecovery

  try {
    await assertPasswordNotReused(params.userId, password)
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Password reuse not allowed',
      status: 400,
    }
  }

  if (forcedChange) {
    try {
      await assertPasswordDifferentFromCurrent(
        params.supabase,
        params.email,
        password
      )
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'New password must be different from your current password',
        status: 400,
      }
    }
  } else {
    const currentPassword = params.currentPassword?.trim()
    if (!currentPassword) {
      return {
        success: false,
        error: 'Current password is required',
        status: 400,
      }
    }

    const { error: reauthError } =
      await params.supabase.auth.signInWithPassword({
        email: params.email,
        password: currentPassword,
      })

    if (reauthError) {
      return {
        success: false,
        error: 'Current password is incorrect',
        status: 400,
      }
    }

    if (currentPassword === password) {
      return {
        success: false,
        error: 'New password must be different from your current password',
        status: 400,
      }
    }
  }

  try {
    await recordPasswordHistory(params.userId, password)
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to record password history',
      status: 500,
    }
  }

  const { error: updateError } = await params.supabase.auth.updateUser({
    password,
  })

  if (updateError) {
    try {
      await removeLatestPasswordHistory(params.userId)
    } catch {
      return {
        success: false,
        error:
          'Failed to update password and could not roll back password history',
        status: 500,
      }
    }

    return { success: false, error: updateError.message, status: 400 }
  }

  const { error: clearFlagError } = await supabaseAdmin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', params.userId)

  if (clearFlagError) {
    return {
      success: false,
      error: 'Password updated but failed to clear change flag',
      status: 500,
    }
  }

  return { success: true }
}

export async function seedProvisionedAdminPassword(params: {
  userId: string
  password: string
}): Promise<AdminPasswordChangeResult> {
  const password = params.password.trim()

  const validation = validateAdminPassword(password)
  if (!validation.valid) {
    return { success: false, error: validation.error, status: 400 }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, must_change_password')
    .eq('id', params.userId)
    .single()

  if (profileError || !profile?.is_admin) {
    return {
      success: false,
      error: 'Target admin profile not found',
      status: 404,
    }
  }

  if (!profile.must_change_password) {
    return {
      success: false,
      error:
        'Password history can only be seeded for provisioned admin accounts',
      status: 400,
    }
  }

  try {
    await recordPasswordHistory(params.userId, password)
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to record password history',
      status: 500,
    }
  }

  return { success: true }
}
