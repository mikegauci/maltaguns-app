import EstablishmentsClient from './establishments-client'
import { fetchAllEstablishments } from '@/lib/public-establishments-data'

export const revalidate = 300

export default async function EstablishmentsPage() {
  const establishments = await fetchAllEstablishments()

  return <EstablishmentsClient establishments={establishments} />
}
