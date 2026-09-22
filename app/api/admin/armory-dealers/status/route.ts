import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { audit } from '@/lib/armory/audit'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth
    const { id, status, note } = await req.json()

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    if (!['approved', 'suspended', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: current, error: fetchError } = await supabaseAdmin
      .from('armory_dealer_accounts')
      .select('id, account_status, company_name')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    if (current.account_status === status) {
      return NextResponse.json(
        { error: `Dealer is already ${status}` },
        { status: 400 }
      )
    }

    const update: Record<string, unknown> = {
      account_status: status,
      status_note: note ?? null,
      updated_at: new Date().toISOString(),
    }

    if (status === 'approved') {
      update.approved_at = new Date().toISOString()
      update.approved_by = auth.user.id
    }

    const { data, error } = await supabaseAdmin
      .from('armory_dealer_accounts')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit(
      status === 'approved' ? 'DEALER_APPROVED' : 'DEALER_SUSPENDED',
      {
        userId: auth.user.id,
        dealerAccountId: id,
        entityType: 'dealer_account',
        entityId: id,
        details: { status, note, companyName: current.company_name },
      }
    )

    return NextResponse.json({
      success: true,
      dealer: data,
      message:
        status === 'approved'
          ? 'Dealer approved — full Armory access unlocked'
          : status === 'suspended'
            ? 'Dealer suspended'
            : 'Dealer status updated',
    })
  } catch (error) {
    console.error('Error updating armory dealer status:', error)
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
