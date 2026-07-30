import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { createAndEmailNotification } from '@/lib/notify-created'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type NotificationPayload = {
  type: string
  title: string
  body: string
  linkUrl: string
  dedupeKey: string
}

export function createNotifyCreatedRoute<
  TBody extends Record<string, unknown>,
>(config: {
  logLabel: string
  bodySchema: z.ZodType<TBody>
  getResourceId: (body: TBody) => string
  table: string
  select: string
  getOwnerId: (resource: Record<string, unknown>) => string
  notFoundMessage: string
  buildNotification: (resource: Record<string, unknown>) => NotificationPayload
}) {
  return async function POST(request: Request) {
    try {
      const auth = await requireAuthenticatedUser()
      if ('error' in auth) return auth.error

      const { user } = auth

      const parsed = config.bodySchema.safeParse(await request.json())
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const resourceId = config.getResourceId(parsed.data)

      const { data: resource, error: resourceError } = await supabaseAdmin
        .from(config.table)
        .select(config.select)
        .eq('id', resourceId)
        .single()

      if (resourceError || !resource) {
        return NextResponse.json(
          { error: config.notFoundMessage },
          { status: 404 }
        )
      }

      const row = resource as unknown as Record<string, unknown>

      if (config.getOwnerId(row) !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const notification = config.buildNotification(row)
      const result = await createAndEmailNotification({
        userId: user.id,
        ...notification,
      })

      return NextResponse.json({ ok: result.ok })
    } catch (error) {
      console.error(`[${config.logLabel}] Unexpected error:`, error)
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        },
        { status: 500 }
      )
    }
  }
}
