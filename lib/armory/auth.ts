import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  mapDealerAccount,
  type ArmoryStaffRole,
  type DealerAccount,
  type DealerAccountRow,
} from './types'

export type ArmoryContext = {
  userId: string
  email: string
  dealerAccount?: DealerAccount
  staffRole?: ArmoryStaffRole
  isApproved: boolean
}

export type ArmoryDealerContext = ArmoryContext & {
  dealerAccount: DealerAccount
  staffRole: ArmoryStaffRole
}

export type ArmoryApprovedDealerContext = ArmoryDealerContext & {
  isApproved: true
}

export async function getArmoryContext(): Promise<ArmoryContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data: owned } = await supabase
    .from('armory_dealer_accounts')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (owned) {
    const dealerAccount = mapDealerAccount(owned as DealerAccountRow)
    return {
      userId: user.id,
      email: user.email,
      dealerAccount,
      staffRole: 'owner',
      isApproved: dealerAccount.accountStatus === 'APPROVED',
    }
  }

  const { data: staffRows } = await supabase
    .from('armory_dealer_staff')
    .select('*, armory_dealer_accounts(*)')
    .eq('profile_id', user.id)
    .is('disabled_at', null)
    .limit(1)

  const staff = staffRows?.[0]
  const dealerRow = staff?.armory_dealer_accounts as
    DealerAccountRow | null | undefined
  if (staff && dealerRow) {
    const dealerAccount = mapDealerAccount(dealerRow)
    return {
      userId: user.id,
      email: user.email,
      dealerAccount,
      staffRole: staff.role as ArmoryStaffRole,
      isApproved: dealerAccount.accountStatus === 'APPROVED',
    }
  }

  return {
    userId: user.id,
    email: user.email,
    isApproved: false,
  }
}

export async function requireArmoryContext(): Promise<ArmoryContext> {
  const ctx = await getArmoryContext()
  if (!ctx) redirect('/login')
  return ctx
}

export async function requireDealerAccount(): Promise<ArmoryDealerContext> {
  const ctx = await requireArmoryContext()
  if (!ctx.dealerAccount || !ctx.staffRole) redirect('/profile/armory/register')
  return ctx as ArmoryDealerContext
}

export async function requireApprovedDealer(): Promise<ArmoryApprovedDealerContext> {
  const ctx = await requireDealerAccount()
  if (!ctx.isApproved) redirect('/profile/armory')
  return ctx as ArmoryApprovedDealerContext
}
