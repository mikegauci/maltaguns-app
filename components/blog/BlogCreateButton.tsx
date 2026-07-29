'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { userHasActiveEstablishment } from '@/lib/establishments'

export function BlogCreateButton() {
  const { supabase, session } = useSupabase()
  const userId = session?.user?.id

  const canCreateQuery = useQuery({
    queryKey: ['blog-can-create', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (profile?.is_admin) return true

      return userHasActiveEstablishment(supabase, userId)
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
