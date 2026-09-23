import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { User } from '@supabase/supabase-js'
import { loginRedirectPath } from '@/lib/auth-routes'

export { loginRedirectPath }

export async function requireUser(returnPath: string): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(loginRedirectPath(returnPath))
  }

  return { supabase, user }
}

export async function requireAdminUser(returnPath: string): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
}> {
  const { supabase, user } = await requireUser(returnPath)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  return { supabase, user }
}
