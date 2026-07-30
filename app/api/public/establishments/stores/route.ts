import { getActiveEstablishmentsResponse } from '@/lib/public-establishments'

export const revalidate = 60

export async function GET() {
  return getActiveEstablishmentsResponse('stores', 'stores')
}
