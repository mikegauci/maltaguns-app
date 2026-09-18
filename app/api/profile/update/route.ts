import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { normalizeBirthdayForInput } from '@/lib/format'
import { profileSchema } from '@/app/profile/types'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { user } = auth
    const body = await request.json()
    const data = profileSchema.parse(body)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(
        'first_name, last_name, birthday, identity_verified, identity_status'
      )
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to load your profile' },
        { status: 500 }
      )
    }

    if (profile.identity_verified) {
      const nameChanged =
        data.first_name !== profile.first_name ||
        data.last_name !== profile.last_name

      if (nameChanged) {
        return NextResponse.json(
          {
            error:
              'Your name is locked after identity verification. Contact Info@maltaguns.com if it needs updating.',
          },
          { status: 400 }
        )
      }
    }

    const nextBirthday = normalizeBirthdayForInput(data.birthday)
    const currentBirthday = normalizeBirthdayForInput(profile.birthday)
    const birthdayChanged = nextBirthday !== currentBirthday

    const updatePayload: Record<string, unknown> = {
      first_name: data.first_name,
      last_name: data.last_name,
      birthday: nextBirthday,
      phone: data.phone,
      address: data.address,
    }

    if (profile.identity_verified && birthdayChanged) {
      Object.assign(updatePayload, {
        identity_verified: false,
        identity_verified_at: null,
        identity_status: 'Not Started',
        identity_first_name: null,
        identity_last_name: null,
        identity_document_type: null,
        identity_review_notes: null,
        didit_session_id: null,
        didit_session_url: null,
        didit_session_created_at: null,
      })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update failed:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      identityReset: profile.identity_verified && birthdayChanged,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update profile',
      },
      { status: 500 }
    )
  }
}
