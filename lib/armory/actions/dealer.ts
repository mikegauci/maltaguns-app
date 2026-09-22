'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { audit } from '@/lib/armory/audit'
import { ActionError, run, str, num, type ActionResult } from './action-utils'
import { ownerAccountCtx, ownerCtx } from './_helpers'

const BASE = '/profile/armory'

export async function updateProfile(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await ownerAccountCtx()
    const method = str(fd, 'shippingAllocationMethod') ?? 'EVEN_SPLIT'
    if (
      !['EVEN_SPLIT', 'FIREARMS_ONLY_EVEN', 'VALUE_WEIGHTED'].includes(method)
    ) {
      throw new ActionError('Invalid allocation method')
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('armory_dealer_accounts')
      .update({
        company_name: str(fd, 'companyName') ?? ctx.dealerAccount.companyName,
        contact_surname: str(fd, 'contactSurname'),
        contact_first_names: str(fd, 'contactFirstNames'),
        contact_date_of_birth: str(fd, 'contactDateOfBirth'),
        contact_place_of_birth: str(fd, 'contactPlaceOfBirth'),
        passport_id_number: str(fd, 'passportIdNumber'),
        passport_issue_date: str(fd, 'passportIssueDate'),
        passport_issuing_authority: str(fd, 'passportIssuingAuthority'),
        registered_address: str(fd, 'registeredAddress'),
        phone_number: str(fd, 'phoneNumber'),
        fax_number: str(fd, 'faxNumber'),
        dealer_licence_number:
          str(fd, 'dealerLicenceNumber') ??
          ctx.dealerAccount.dealerLicenceNumber,
        dealer_licence_expiry: str(fd, 'dealerLicenceExpiry'),
        shipping_allocation_method: method,
        default_handling_fee_rifle: num(fd, 'defaultHandlingFeeRifle'),
        default_handling_fee_pistol: num(fd, 'defaultHandlingFeePistol'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.dealerAccount.id)

    if (error) throw new ActionError(error.message)

    await audit('DEALER_PROFILE_UPDATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
    })
    revalidatePath(BASE, 'layout')
    revalidatePath(`${BASE}/company-profile`)
    return { ok: true, message: 'Profile saved' }
  })
}

export async function createStaff(fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await ownerCtx()
    const email = (str(fd, 'email') ?? '').toLowerCase()
    const name = str(fd, 'name')
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
      throw new ActionError('Valid email required')

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (profileError) throw new ActionError(profileError.message)
    if (!profile) {
      throw new ActionError(
        'No MaltaGuns account found for that email. They must register first, then you can invite them.'
      )
    }

    if (profile.id === ctx.userId)
      throw new ActionError('You are already the account owner')

    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('armory_dealer_staff')
      .select('id, disabled_at')
      .eq('dealer_account_id', ctx.dealerAccount.id)
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (existing && !existing.disabled_at) {
      throw new ActionError('That user is already on your team')
    }

    if (existing?.disabled_at) {
      const { error } = await supabase
        .from('armory_dealer_staff')
        .update({ disabled_at: null, name, role: 'staff' })
        .eq('id', existing.id)
      if (error) throw new ActionError(error.message)
    } else {
      const { error } = await supabase.from('armory_dealer_staff').insert({
        profile_id: profile.id,
        dealer_account_id: ctx.dealerAccount.id,
        role: 'staff',
        name,
      })
      if (error) throw new ActionError(error.message)
    }

    await audit('USER_CREATED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'staff',
      entityId: profile.id,
      details: { email, role: 'staff' },
    })
    revalidatePath(`${BASE}/team`)
    return { ok: true, message: `Staff member ${email} added to your team.` }
  })
}

export async function disableStaff(staffId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await ownerCtx()
    const supabase = await createClient()
    const { data: staff, error: fetchError } = await supabase
      .from('armory_dealer_staff')
      .select('id, profile_id, role')
      .eq('id', staffId)
      .eq('dealer_account_id', ctx.dealerAccount.id)
      .maybeSingle()

    if (fetchError) throw new ActionError(fetchError.message)
    if (!staff || staff.role === 'owner')
      throw new ActionError('Staff member not found')
    if (staff.profile_id === ctx.userId)
      throw new ActionError('You cannot disable your own account')

    const { error } = await supabase
      .from('armory_dealer_staff')
      .update({ disabled_at: new Date().toISOString() })
      .eq('id', staffId)

    if (error) throw new ActionError(error.message)

    await audit('USER_DISABLED', {
      userId: ctx.userId,
      dealerAccountId: ctx.dealerAccount.id,
      entityType: 'staff',
      entityId: staffId,
    })
    revalidatePath(`${BASE}/team`)
    return { ok: true, message: 'Staff member disabled' }
  })
}

export async function resetStaffPassword(
  _staffId: string,
  _password: string
): Promise<ActionResult> {
  return {
    ok: false,
    error:
      'Passwords are managed through MaltaGuns account settings (Supabase Auth).',
  }
}
