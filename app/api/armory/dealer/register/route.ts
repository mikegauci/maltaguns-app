import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { audit } from '@/lib/armory/audit'

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedUser()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const {
    companyName,
    contactName,
    phoneNumber,
    dealerLicenceNumber,
    dealerLicenceExpiry,
  } = body

  if (!companyName?.trim()) {
    return NextResponse.json(
      { error: 'Company name is required' },
      { status: 400 }
    )
  }
  if (!contactName?.trim()) {
    return NextResponse.json(
      { error: 'Licence holder name is required' },
      { status: 400 }
    )
  }
  if (!phoneNumber?.trim()) {
    return NextResponse.json(
      { error: 'Phone number is required' },
      { status: 400 }
    )
  }
  if (!dealerLicenceNumber?.trim()) {
    return NextResponse.json(
      { error: 'Dealer licence number is required' },
      { status: 400 }
    )
  }
  if (!dealerLicenceExpiry) {
    return NextResponse.json(
      { error: 'Licence expiry date is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('armory_dealer_accounts')
    .select('id')
    .eq('owner_id', auth.user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a dealership registration' },
      { status: 400 }
    )
  }

  const nameParts = contactName.trim().split(/\s+/)
  const contactSurname = nameParts.length > 1 ? nameParts.pop() : contactName
  const contactFirstNames = nameParts.join(' ') || contactSurname

  const { data: account, error: accountError } = await supabase
    .from('armory_dealer_accounts')
    .insert({
      owner_id: auth.user.id,
      company_name: companyName.trim(),
      contact_surname: contactSurname,
      contact_first_names: contactFirstNames,
      phone_number: phoneNumber.trim(),
      dealer_licence_number: dealerLicenceNumber.trim(),
      dealer_licence_expiry: dealerLicenceExpiry,
      email: auth.user.email,
      account_status: 'pending',
    })
    .select()
    .single()

  if (accountError || !account) {
    return NextResponse.json(
      { error: accountError?.message ?? 'Failed to create dealer account' },
      { status: 500 }
    )
  }

  const { error: staffError } = await supabase
    .from('armory_dealer_staff')
    .insert({
      profile_id: auth.user.id,
      dealer_account_id: account.id,
      role: 'owner',
      name: contactName.trim(),
    })

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 })
  }

  await audit('DEALER_PROFILE_UPDATED', {
    userId: auth.user.id,
    dealerAccountId: account.id,
    entityType: 'dealer_account',
    entityId: account.id,
    details: { action: 'register', companyName },
  })

  return NextResponse.json({ account })
}
