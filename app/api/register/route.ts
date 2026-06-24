import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip')
}

export async function POST(req: Request) {
  try {
    const data = await req.json()

    if (!data?.email || !data?.password || !data?.username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const registrationIp = getClientIp(req)

    // Anon client to trigger the signup + confirmation email (same as before)
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const { data: authData, error: authError } = await supabaseAuth.auth.signUp(
      {
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
          data: {
            username: data.username,
          },
        },
      }
    )

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData?.user?.id
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found after signup.' },
        { status: 500 }
      )
    }

    // When the email already exists, Supabase returns an obfuscated user with
    // an empty identities array and no error (to prevent email enumeration).
    // In that case no real auth user was created, so stop before inserting a
    // profile (which would fail the auth.users foreign key).
    const identities = authData?.user?.identities
    if (!identities || identities.length === 0) {
      return NextResponse.json(
        { error: 'This email is already registered. Please log in instead.' },
        { status: 409 }
      )
    }

    // Service-role client to insert the profile (bypasses RLS) and store the IP
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        birthday: data.birthday,
        phone: data.phone,
        address: data.address,
        is_seller: data.interestedInSelling,
        is_verified: data.isVerified,
        license_image: data.interestedInSelling ? data.licenseImage : null,
        license_expiry_date: data.interestedInSelling
          ? data.licenseExpiryDate
          : null,
        id_card_image: data.interestedInSelling ? data.idCardImage : null,
        id_card_verified: data.interestedInSelling
          ? data.idCardVerified
          : false,
        license_types: data.interestedInSelling ? data.licenseTypes : null,
        contact_preference: data.contactPreference,
        registration_ip: registrationIp,
      })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in register endpoint:', error)
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
