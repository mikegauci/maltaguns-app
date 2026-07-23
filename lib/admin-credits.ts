import { supabaseAdmin } from '@/lib/supabaseAdmin'

type AdminClient = typeof supabaseAdmin

export type CreditsTable = 'credits' | 'credits_events'

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
