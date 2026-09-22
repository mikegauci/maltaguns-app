import { redirect } from 'next/navigation'
import { getProfileNavContext } from '@/lib/profile-nav-context'
import { ProfileBlogPageClient } from './blog-page-client'

export default async function ProfileBlogPage() {
  const navContext = await getProfileNavContext()

  if (!navContext?.canAccessBlog) {
    redirect('/profile')
  }

  return <ProfileBlogPageClient />
}
