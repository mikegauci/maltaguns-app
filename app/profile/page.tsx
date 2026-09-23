import ProfileClient from './profile-client'
import { requireUser } from '@/lib/require-auth'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  await requireUser('/profile')

  return <ProfileClient />
}
