import { createClient } from '@supabase/supabase-js'

const LICENSES_BUCKET = 'licenses'
const LICENSE_SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

let adminClient: ReturnType<typeof createClient> | null = null

function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  }
  return adminClient
}

/**
 * `license_image`/`id_card_image` were historically stored as full public
 * Storage URLs (`.../storage/v1/object/public/licenses/<path>`). The bucket
 * is now private, so those URLs no longer resolve directly - this extracts
 * the underlying object path so a signed URL can be requested instead.
 */
export function extractLicenseObjectPath(stored: string | null): string | null {
  if (!stored) return null

  const publicMarker = `/object/public/${LICENSES_BUCKET}/`
  const publicIdx = stored.indexOf(publicMarker)
  if (publicIdx !== -1) return stored.slice(publicIdx + publicMarker.length)

  const signMarker = `/object/sign/${LICENSES_BUCKET}/`
  const signIdx = stored.indexOf(signMarker)
  if (signIdx !== -1) {
    return stored.slice(signIdx + signMarker.length).split('?')[0]
  }

  // Not URL-shaped - assume it's already a bare object path.
  if (!stored.includes('://')) return stored

  return null
}

/**
 * Signs a stored license/id-card reference (public-URL-shaped or bare path)
 * into a short-lived URL using the service role key. Callers are responsible
 * for authorizing the caller (admin or document owner) before invoking this.
 */
export async function signLicenseUrl(
  stored: string | null
): Promise<string | null> {
  const path = extractLicenseObjectPath(stored)
  if (!path) return null

  const { data, error } = await getAdminClient()
    .storage.from(LICENSES_BUCKET)
    .createSignedUrl(path, LICENSE_SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.error('Failed to sign license URL:', error)
    return null
  }

  return data.signedUrl
}

export async function signLicenseUrls(
  stored: (string | null)[]
): Promise<(string | null)[]> {
  return Promise.all(stored.map(signLicenseUrl))
}
