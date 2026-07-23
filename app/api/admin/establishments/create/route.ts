import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const {
      owner_id,
      type,
      name,
      location,
      email,
      phone,
      description,
      website,
      logo_url,
    } = await req.json()

    if (!owner_id || !type || !name || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: owner_id, type, name, location' },
        { status: 400 }
      )
    }

    if (!['store', 'club', 'servicing', 'range'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid establishment type' },
        { status: 400 }
      )
    }

    const { data: ownerProfile, error: ownerError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email')
      .eq('id', owner_id)
      .single()

    if (ownerError || !ownerProfile) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')

    const tableName = type === 'servicing' ? 'servicing' : `${type}s`

    const baseData = {
      business_name: name,
      location,
      owner_id,
      slug,
      email: email || '',
      phone: phone || '',
      description: description || null,
      website: website || null,
      logo_url: logo_url || null,
    }

    const { data: newEstablishment, error: insertError } = await supabaseAdmin
      .from(tableName)
      .insert(baseData)
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: `Failed to create establishment: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      establishment: newEstablishment,
      message: `${getTypeLabel(type)} created successfully and assigned to ${ownerProfile.username}`,
    })
  } catch (error) {
    console.error('Error in create establishment endpoint:', error)
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

function getTypeLabel(type: string): string {
  switch (type) {
    case 'store':
      return 'Store'
    case 'club':
      return 'Club'
    case 'servicing':
      return 'Servicing'
    case 'range':
      return 'Range'
    default:
      return type
  }
}
