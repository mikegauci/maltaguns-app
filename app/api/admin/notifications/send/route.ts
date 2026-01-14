import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const sendSchema = z.object({
  sendToAll: z.boolean().default(false),
  userIds: z.array(z.string().uuid()).default([]),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(100),
  linkUrl: z.string().max(2048).optional().nullable(),
})

async function listAllUserIds(): Promise<string[]> {
  const ids: string[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, is_disabled')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error
    const rows = data ?? []

    for (const r of rows) {
      if (!r.is_disabled) ids.push(r.id)
    }

    if (rows.length < pageSize) break
    from += pageSize
  }

  return ids
}

export async function POST(request: Request) {
  try {
    // Verify admin privileges using the current session
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (profileError || !currentUserProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin privileges required' },
        { status: 403 }
      )
    }

    const parsed = sendSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { sendToAll, userIds, title, description, linkUrl } = parsed.data

    const recipients = sendToAll ? await listAllUserIds() : userIds
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients selected' },
        { status: 400 }
      )
    }

    const dedupeKey = `manual:${crypto.randomUUID()}`

    const rows = recipients.map(user_id => ({
      user_id,
      type: 'manual',
      title,
      body: description,
      link_url: linkUrl || null,
      dedupe_key: dedupeKey,
      // email_status defaults to pending (DB default)
    }))

    // Insert in chunks to avoid request limits
    const chunkSize = 1000
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { error } = await supabaseAdmin.from('notifications').insert(chunk)
      if (error) throw error
    }

    return NextResponse.json(
      { success: true, sent: recipients.length },
      { status: 200 }
    )
  } catch (error) {
    console.error('[ADMIN NOTIFICATIONS SEND] Unexpected error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

