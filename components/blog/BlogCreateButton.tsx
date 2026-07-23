'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export function BlogCreateButton() {
  const { supabase, session } = useSupabase()
  const userId = session?.user?.id

  const canCreateQuery = useQuery({
    queryKey: ['blog-can-create', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false

      const [profileRes, storeRes, clubRes, rangeRes, servicingRes] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .single(),
          supabase
            .from('stores')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle(),
          supabase
            .from('clubs')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle(),
          supabase
            .from('ranges')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle(),
          supabase
            .from('servicing')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle(),
        ])

      const isAdmin = !!profileRes.data?.is_admin
      const hasEstablishment =
        !!storeRes.data ||
        !!clubRes.data ||
        !!rangeRes.data ||
        !!servicingRes.data

      return isAdmin || hasEstablishment
    },
  })

  if (!canCreateQuery.data) return null

  return (
    <Link href="/blog/create">
      <Button className="bg-primary">
        <Plus className="h-4 w-4 mr-2" />
        Write Post
      </Button>
    </Link>
  )
}
