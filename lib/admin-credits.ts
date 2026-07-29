import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type AdminClient = typeof supabaseAdmin

export type CreditsTable = 'credits' | 'credits_events'

export type CreditAmountPolicy = 'positive' | 'nonNegative'

export function parseCreditAmount(
  amount: unknown,
  policy: CreditAmountPolicy
): { ok: true; value: number } | { ok: false; message: string } {
  const numeric = Number(amount)
  if (!amount || isNaN(numeric)) {
    return {
      ok: false,
      message:
        policy === 'positive'
          ? 'A valid positive amount is required'
          : 'A valid non-negative amount is required',
    }
  }

  if (policy === 'positive' && numeric <= 0) {
    return { ok: false, message: 'A valid positive amount is required' }
  }

  if (policy === 'nonNegative' && numeric < 0) {
    return { ok: false, message: 'A valid non-negative amount is required' }
  }

  return { ok: true, value: numeric }
}

export function createCreditsListHandler(table: CreditsTable) {
  return async function GET() {
    try {
      const auth = await requireAdmin()
      if ('error' in auth) return auth.error

      const result = await listCreditsWithProfiles(auth.supabaseAdmin, table)

      if ('error' in result && result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({ data: result.data ?? [] })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }
}

export function createCreditsCreateHandler(config: {
  table: CreditsTable
  incrementExisting: boolean
  amountPolicy: CreditAmountPolicy
  successMessage: string
  failureMessage: string
  logLabel?: string
}) {
  return async function POST(req: NextRequest) {
    try {
      const auth = await requireAdmin()
      if ('error' in auth) return auth.error

      const { supabaseAdmin: admin } = auth
      const { user_id, amount } = await req.json()

      if (!user_id) {
        return NextResponse.json(
          { message: 'User ID is required' },
          { status: 400 }
        )
      }

      const parsedAmount = parseCreditAmount(amount, config.amountPolicy)
      if (!parsedAmount.ok) {
        return NextResponse.json(
          { message: parsedAmount.message },
          { status: 400 }
        )
      }

      const userCheck = await ensureUserExists(admin, user_id)
      if ('error' in userCheck) {
        return NextResponse.json(
          { message: userCheck.error },
          { status: userCheck.status }
        )
      }

      const { data, error } = await addOrIncrementCredits(admin, {
        table: config.table,
        userId: user_id,
        amount: parsedAmount.value,
        incrementExisting: config.incrementExisting,
      })

      if (error) {
        if (config.logLabel) {
          console.error(`Error adding ${config.logLabel}:`, error)
        }
        return NextResponse.json(
          { message: config.failureMessage, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: config.successMessage,
        data,
      })
    } catch (error) {
      if (config.logLabel) {
        console.error(`Error in ${config.logLabel} create:`, error)
      }
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

type CreditRow = {
  id: string
  user_id: string
  amount: string | number
  created_at: string
  updated_at: string
}

type Profile = {
  id: string
  username?: string | null
  email?: string | null
}

export async function listCreditsWithProfiles(
  client: AdminClient,
  table: CreditsTable
) {
  const { data: credits, error: creditsError } = await client
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })

  if (creditsError) {
    return { error: creditsError.message as string }
  }

  if (!credits || credits.length === 0) {
    return {
      data: [] as Array<CreditRow & { username: string; email: string }>,
    }
  }

  const rows = credits as CreditRow[]
  const userIds = Array.from(new Set(rows.map(c => c.user_id)))

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('id, username, email')
    .in('id', userIds)

  if (profilesError) {
    console.error('Direct API profiles error:', profilesError)
  }

  const profileMap: Record<string, Profile> = {}
  if (profiles) {
    for (const profile of profiles as Profile[]) {
      profileMap[profile.id] = profile
    }
  }

  const data = rows.map(credit => ({
    ...credit,
    username: profileMap[credit.user_id]?.username || 'Unknown',
    email: profileMap[credit.user_id]?.email || '',
  }))

  return { data }
}

export async function ensureUserExists(
  client: AdminClient,
  userId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const { data: userExists, error: userError } = await client
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (userError || !userExists) {
    return { error: 'User not found', status: 404 }
  }

  return { ok: true }
}

export async function addOrIncrementCredits(
  client: AdminClient,
  options: {
    table: CreditsTable
    userId: string
    amount: number
    incrementExisting?: boolean
  }
) {
  const { table, userId, amount, incrementExisting = false } = options

  if (incrementExisting) {
    const { data: existingCredit, error: existingError } = await client
      .from(table)
      .select('id, amount')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingError) {
      return { data: null, error: existingError }
    }

    if (existingCredit) {
      const newAmount = Number(existingCredit.amount) + amount
      return client
        .from(table)
        .update({
          amount: newAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCredit.id)
        .select()
    }
  }

  return client
    .from(table)
    .insert({
      user_id: userId,
      amount,
    })
    .select()
}
