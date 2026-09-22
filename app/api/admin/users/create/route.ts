import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { validateAdminPassword } from '@/lib/admin-password-policy'
import { recordPasswordHistory } from '@/lib/admin-password-history'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { supabaseAdmin } = auth

  let body: {
    username?: string
    email?: string
    password?: string
    first_name?: string
    last_name?: string
    is_admin?: boolean
    is_seller?: boolean
    is_disabled?: boolean
    notes?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const username = body.username?.trim()
  const email = body.email?.trim()
  const password = body.password?.trim()
  const isAdmin = Boolean(body.is_admin)

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: 'username, email, and password are required' },
      { status: 400 }
    )
  }

  if (isAdmin) {
    const validation = validateAdminPassword(password)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
      },
    })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user?.id
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID not found after signup' },
      { status: 500 }
    )
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    username,
    email,
    first_name: body.first_name?.trim() || null,
    last_name: body.last_name?.trim() || null,
    is_admin: isAdmin,
    is_seller: Boolean(body.is_seller),
    is_disabled: Boolean(body.is_disabled),
    notes: body.notes ?? null,
    must_change_password: isAdmin,
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  if (isAdmin) {
    try {
      await recordPasswordHistory(userId, password)
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('profiles').delete().eq('id', userId)

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to seed admin password history',
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true, userId })
}
