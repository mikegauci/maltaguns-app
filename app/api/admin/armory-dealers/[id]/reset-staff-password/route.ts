import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { audit } from '@/lib/armory/audit'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id: dealerAccountId } = await params
    const { staffId } = await req.json()
    if (!staffId) {
      return NextResponse.json(
        { error: 'staffId is required' },
        { status: 400 }
      )
    }

    const { supabaseAdmin } = auth
    const { data: staff, error: fetchError } = await supabaseAdmin
      .from('armory_dealer_staff')
      .select('id, profile_id, role, profiles(email)')
      .eq('id', staffId)
      .eq('dealer_account_id', dealerAccountId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    if (!staff || staff.role === 'owner') {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    const profile = staff.profiles as unknown as { email: string | null } | null
    const email = profile?.email
    if (!email) {
      return NextResponse.json(
        { error: 'Staff member has no email on file' },
        { status: 400 }
      )
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
      'https://maltaguns.com'
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit('USER_PASSWORD_RESET', {
      userId: auth.user.id,
      dealerAccountId,
      entityType: 'staff',
      entityId: staffId,
      details: { email, by: 'platform_admin' },
    })

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${email}.`,
    })
  } catch (error) {
    console.error('Error sending staff password reset:', error)
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
