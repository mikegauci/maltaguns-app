import type { SupabaseClient } from '@supabase/supabase-js'
import { resizeImageForUpload } from '@/lib/image-resize'

const ESTABLISHMENT_LOGO_BUCKET = 'establishments'

const ESTABLISHMENT_TABLES = ['stores', 'clubs', 'ranges', 'servicing'] as const

export type EstablishmentTable = (typeof ESTABLISHMENT_TABLES)[number]

export async function uploadEstablishmentLogo(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<string> {
  const resized = await resizeImageForUpload(file)
  const fileExt = resized.name.split('.').pop() || 'webp'
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `logos/${fileName}`

  const { error } = await supabase.storage
    .from(ESTABLISHMENT_LOGO_BUCKET)
    .upload(filePath, resized, {
      cacheControl: '31536000',
      upsert: false,
      contentType: resized.type,
    })

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from(ESTABLISHMENT_LOGO_BUCKET).getPublicUrl(filePath)

  return publicUrl
}

export async function findFirstActiveEstablishment(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  table: EstablishmentTable
  id: string
} | null> {
  const results = await Promise.all(
    ESTABLISHMENT_TABLES.map(async table => {
      const { data } = await supabase
        .from(table)
        .select('id')
        .eq('owner_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      return data ? { table, id: data.id } : null
    })
  )

  return results.find(Boolean) ?? null
}

export async function userHasActiveEstablishment(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  return !!(await findFirstActiveEstablishment(supabase, userId))
}

export async function isActiveEstablishmentOwnedByUser(
  supabase: SupabaseClient,
  table: EstablishmentTable,
  establishmentId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('id', establishmentId)
    .eq('owner_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return !!data
}
