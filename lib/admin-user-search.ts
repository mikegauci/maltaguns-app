import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AdminSearchUser } from '@/lib/admin-user-types'

export type { AdminSearchUser } from '@/lib/admin-user-types'
export { formatAdminUserLabel } from '@/lib/admin-user-types'

export function sanitizeAdminUserSearchTerm(term: string): string {
  return term
    .replace(/[%(),"'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64)
}

export async function searchAdminUsers(
  rawQuery: string
): Promise<{ users: AdminSearchUser[]; error: string | null }> {
  const q = sanitizeAdminUserSearchTerm(rawQuery)

  let query = supabaseAdmin
    .from('profiles')
    .select('id, username, email, first_name, last_name, is_disabled')
    .limit(50)

  if (q.length > 0) {
    const like = `%${q}%`
    query = query
      .or(
        `username.ilike.${like},email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`
      )
      .order('username', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    return { users: [], error: error.message }
  }

  return { users: (data ?? []) as AdminSearchUser[], error: null }
}
