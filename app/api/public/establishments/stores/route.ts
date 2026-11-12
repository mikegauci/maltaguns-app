import { getActiveEstablishmentsResponse } from '@/lib/public-establishments'

export const revalidate = 300

export async function GET() {
  return getActiveEstablishmentsResponse('stores', 'stores')
}
