import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: `Failed to fetch transactions: ${transactionsError.message}` },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        payments: [],
        count: 0,
      })
    }

    // Get unique user IDs for profile lookup
    const userIds = Array.from(new Set(transactions.map(t => t.user_id)))

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email, first_name, last_name')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      // Continue without user data if profiles fail
    }

    // Create a map of user IDs to profiles for quick lookup
    const userProfileMap = new Map()
    profiles?.forEach(profile => {
      userProfileMap.set(profile.id, profile)
    })

    // Combine transaction data with user information
    const paymentsWithUserInfo = transactions.map(transaction => {
      const userProfile = userProfileMap.get(transaction.user_id)
      return {
        id: transaction.id,
        user_id: transaction.user_id,
        username: userProfile?.username || 'Unknown',
        email: userProfile?.email || 'Unknown',
        first_name: userProfile?.first_name || '',
        last_name: userProfile?.last_name || '',
        amount: transaction.amount,
        type: transaction.type,
        credit_type: transaction.credit_type,
        stripe_payment_id: transaction.stripe_payment_id,
        status: transaction.status,
        description: transaction.description,
        created_at: transaction.created_at,
      }
    })

    return NextResponse.json({
      payments: paymentsWithUserInfo,
      count: paymentsWithUserInfo.length,
    })
  } catch (error) {
    console.error('Error in payments-received endpoint:', error)
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
