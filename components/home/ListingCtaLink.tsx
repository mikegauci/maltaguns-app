'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useSupabase } from '@/components/providers/SupabaseProvider'

interface ListingCtaLinkProps {
  linkClassName?: string
  buttonClassName: string
}

// Reads the session in the browser so the home page itself can stay cached.
export function ListingCtaLink({
  linkClassName,
  buttonClassName,
}: ListingCtaLinkProps) {
  const { session } = useSupabase()
  const isAuthenticated = Boolean(session)

  return (
    <Link
      href={isAuthenticated ? '/marketplace/create' : '/register'}
      className={linkClassName}
    >
      <Button size="lg" className={buttonClassName}>
        {isAuthenticated ? 'Post a listing' : 'Create account'}
      </Button>
    </Link>
  )
}
