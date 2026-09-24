'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { EditButton } from '@/components/ui/edit-button'

type BlogPostEditActionsProps = {
  category: string
  slug: string
  authorId: string
}

export function BlogPostEditActions({
  category,
  slug,
  authorId,
}: BlogPostEditActionsProps) {
  const { supabase, session } = useSupabase()
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolveCanEdit() {
      const userId = session?.user?.id
      if (!userId) {
        if (!cancelled) setCanEdit(false)
        return
      }

      if (userId === authorId) {
        if (!cancelled) setCanEdit(true)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (!cancelled) setCanEdit(!!profile?.is_admin)
    }

    resolveCanEdit()

    return () => {
      cancelled = true
    }
  }, [authorId, session?.user?.id, supabase])

  if (!canEdit) return null

  return (
    <EditButton
      label="Edit Post"
      href={`/blog/${category}/${slug}/edit`}
      hideLabelOnMobile={false}
    />
  )
}
