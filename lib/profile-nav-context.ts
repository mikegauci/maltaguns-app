import { createClient } from '@/lib/supabase/server'
import { getArmoryContext } from '@/lib/armory/auth'
import {
  buildProfileNavGroups,
  type ProfileNavBadgeKey,
} from '@/lib/profile-nav'

export type ProfileNavContext = {
  canAccessBlog: boolean
  badges: Partial<Record<ProfileNavBadgeKey, number>>
  navGroups: ReturnType<typeof buildProfileNavGroups>
  armoryHasDealer: boolean
  armoryStaffRole?: string
  armoryCompanyName?: string
  armoryLicenceNumber?: string
  armoryAccountStatus?: string
  armoryLicenceExpiry?: string | null
  armoryStatusNote?: string | null
}

export async function getProfileNavContext(): Promise<ProfileNavContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const armoryCtx = await getArmoryContext()

  const [
    profileRes,
    listingsRes,
    eventsRes,
    storesRes,
    clubsRes,
    servicingRes,
    rangesRes,
  ] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id),
    supabase.from('stores').select('id, status').eq('owner_id', user.id),
    supabase.from('clubs').select('id, status').eq('owner_id', user.id),
    supabase.from('servicing').select('id, status').eq('owner_id', user.id),
    supabase.from('ranges').select('id, status').eq('owner_id', user.id),
  ])

  const isAdmin = profileRes.data?.is_admin ?? false
  const stores = storesRes.error ? [] : (storesRes.data ?? [])
  const clubs = clubsRes.error ? [] : (clubsRes.data ?? [])
  const servicing = servicingRes.error ? [] : (servicingRes.data ?? [])
  const ranges = rangesRes.error ? [] : (rangesRes.data ?? [])
  const allEstablishments = [...stores, ...clubs, ...servicing, ...ranges]
  const canAccessBlog =
    isAdmin || allEstablishments.some(e => e.status === 'active')

  const badges = {
    listings: listingsRes.error ? 0 : (listingsRes.count ?? 0),
    events: eventsRes.error ? 0 : (eventsRes.count ?? 0),
    establishments: allEstablishments.length,
    companyProfilePending:
      armoryCtx?.dealerAccount?.accountStatus === 'PENDING' ? 1 : 0,
  }

  return {
    canAccessBlog,
    badges,
    navGroups: buildProfileNavGroups({ canAccessBlog, armoryCtx }),
    armoryHasDealer: Boolean(armoryCtx?.dealerAccount),
    armoryStaffRole: armoryCtx?.staffRole,
    armoryCompanyName: armoryCtx?.dealerAccount?.companyName,
    armoryLicenceNumber:
      armoryCtx?.dealerAccount?.dealerLicenceNumber ?? undefined,
    armoryAccountStatus: armoryCtx?.dealerAccount?.accountStatus,
    armoryLicenceExpiry: armoryCtx?.dealerAccount?.dealerLicenceExpiry ?? null,
    armoryStatusNote: armoryCtx?.dealerAccount?.statusNote ?? null,
  }
}
