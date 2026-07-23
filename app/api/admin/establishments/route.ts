import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: clubs, error: clubsError } = await supabaseAdmin
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: servicing, error: servicingError } = await supabaseAdmin
      .from('servicing')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: ranges, error: rangesError } = await supabaseAdmin
      .from('ranges')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('Raw data counts:', {
      stores: stores?.length || 0,
      clubs: clubs?.length || 0,
      servicing: servicing?.length || 0,
      ranges: ranges?.length || 0,
    })

    if (storesError || clubsError || servicingError || rangesError) {
      console.error('Error fetching establishments:', {
        storesError,
        clubsError,
        servicingError,
        rangesError,
      })
      return NextResponse.json(
        { error: 'Failed to fetch establishment data' },
        { status: 500 }
      )
    }

    const ownerIds = new Set<string>()

    stores?.forEach(store => {
      if (store.owner_id) ownerIds.add(store.owner_id)
    })

    clubs?.forEach(club => {
      if (club.owner_id) ownerIds.add(club.owner_id)
    })

    servicing?.forEach(service => {
      if (service.owner_id) ownerIds.add(service.owner_id)
    })

    ranges?.forEach(range => {
      if (range.owner_id) ownerIds.add(range.owner_id)
    })

    const { data: ownerProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, email')
      .in('id', Array.from(ownerIds))

    if (profilesError) {
      console.error('Error fetching owner profiles:', profilesError)
    }

    const ownerProfileMap = new Map()
    ownerProfiles?.forEach(profile => {
      ownerProfileMap.set(profile.id, profile)
    })

    const formattedStores =
      stores?.map(store => {
        const owner = ownerProfileMap.get(store.owner_id)
        return {
          id: store.id,
          name: store.business_name,
          type: 'store',
          owner_id: store.owner_id,
          ownerName: owner?.username || 'Unknown',
          ownerEmail: owner?.email || 'Unknown',
          location: store.location,
          email: store.email,
          phone: store.phone,
          created_at: store.created_at,
          slug: store.slug,
          status: store.status || 'active',
          logo_url: store.logo_url,
          meta_title: store.meta_title || null,
          meta_description: store.meta_description || null,
        }
      }) || []

    const formattedClubs =
      clubs?.map(club => {
        const owner = ownerProfileMap.get(club.owner_id)
        return {
          id: club.id,
          name: club.business_name,
          type: 'club',
          owner_id: club.owner_id,
          ownerName: owner?.username || 'Unknown',
          ownerEmail: owner?.email || 'Unknown',
          location: club.location,
          email: club.email,
          phone: club.phone,
          created_at: club.created_at,
          slug: club.slug,
          status: club.status || 'active',
          logo_url: club.logo_url,
          meta_title: club.meta_title || null,
          meta_description: club.meta_description || null,
        }
      }) || []

    const formattedServicing =
      servicing?.map(service => {
        const owner = ownerProfileMap.get(service.owner_id)
        return {
          id: service.id,
          name: service.business_name,
          type: 'servicing',
          owner_id: service.owner_id,
          ownerName: owner?.username || 'Unknown',
          ownerEmail: owner?.email || 'Unknown',
          location: service.location,
          email: service.email,
          phone: service.phone,
          created_at: service.created_at,
          slug: service.slug,
          status: service.status || 'active',
          logo_url: service.logo_url,
          meta_title: service.meta_title || null,
          meta_description: service.meta_description || null,
        }
      }) || []

    const formattedRanges =
      ranges?.map(range => {
        const owner = ownerProfileMap.get(range.owner_id)
        return {
          id: range.id,
          name: range.business_name,
          type: 'range',
          owner_id: range.owner_id,
          ownerName: owner?.username || 'Unknown',
          ownerEmail: owner?.email || 'Unknown',
          location: range.location,
          email: range.email,
          phone: range.phone,
          created_at: range.created_at,
          slug: range.slug,
          status: range.status || 'active',
          logo_url: range.logo_url,
          meta_title: range.meta_title || null,
          meta_description: range.meta_description || null,
        }
      }) || []

    const allEstablishments = [
      ...formattedStores,
      ...formattedClubs,
      ...formattedServicing,
      ...formattedRanges,
    ]

    allEstablishments.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({
      establishments: allEstablishments,
      count: allEstablishments.length,
      counts: {
        stores: formattedStores.length,
        clubs: formattedClubs.length,
        servicing: formattedServicing.length,
        ranges: formattedRanges.length,
      },
    })
  } catch (error) {
    console.error('Error in establishments endpoint:', error)
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
