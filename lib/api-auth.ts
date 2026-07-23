import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { User } from '@supabase/supabase-js'

type RequireAdminSuccess = {
  user: User
  supabaseAdmin: typeof supabaseAdmin
}

type RequireAdminFailure = {
  error: NextResponse
}

export async function requireAdmin(): Promise<
  RequireAdminSuccess | RequireAdminFailure
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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
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
