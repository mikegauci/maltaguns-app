import type { SupabaseClient } from '@supabase/supabase-js'

const PAGE_SIZE = 1000

export function isCompletedTransactionStatus(
  status: string | null | undefined
) {
  return !status || status === 'completed' || status === 'succeeded'
}

export async function sumCompletedRevenueSince(
  supabaseAdmin: SupabaseClient,
  sinceIso: string
) {
  let offset = 0
  let sum = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('credit_transactions')
      .select('amount, status')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    if (!data?.length) {
      break
    }

    for (const transaction of data) {
      if (isCompletedTransactionStatus(transaction.status)) {
        sum += Number(transaction.amount ?? 0)
      }
    }

    if (data.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  return sum
}

export async function sumBlogViewCounts(supabaseAdmin: SupabaseClient) {
  let offset = 0
  let totalViews = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .select('view_count')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    if (!data?.length) {
      break
    }

    for (const post of data) {
      totalViews += Number(post.view_count ?? 0)
    }

    if (data.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  return totalViews
}

export async function runSafe<T>(
  label: string,
  fn: () => Promise<T>,
  warnings: string[],
  fallback: T
) {
  try {
    return await fn()
  } catch (error) {
    warnings.push(
      `${label}: ${error instanceof Error ? error.message : 'Unavailable'}`
    )
    return fallback
  }
}
