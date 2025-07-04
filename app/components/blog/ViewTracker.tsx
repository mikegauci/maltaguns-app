'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'

interface ViewTrackerProps {
  postId: string
}

export default function ViewTracker({ postId }: ViewTrackerProps) {
  const supabase = createClientComponentClient<Database>()
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    // Track the view when component mounts
    const trackView = async () => {
      if (tracked) return // Prevent double tracking

      try {
        // Try using the RPC function (most reliable)
        try {
          const { data: newCount, error: rpcError } = await supabase.rpc(
            'increment_blog_view_count',
            { post_id: postId }
          )

          if (rpcError) {
            throw rpcError // Fall through to direct update method
          }

          if (newCount !== -1) {
            setTracked(true)
            return
          }
        } catch (rpcError) {
          // Fallback: Direct database update method
          const { data: currentPost, error: fetchError } = await supabase
            .from('blog_posts')
            .select('view_count')
            .eq('id', postId)
            .single()

          if (fetchError || !currentPost) {
            return
          }

          // Increment the view count
          const newViewCount = (currentPost.view_count || 0) + 1

          const { error: updateError } = await supabase
            .from('blog_posts')
            .update({ view_count: newViewCount })
            .eq('id', postId)

          if (!updateError) {
            setTracked(true)
          }
        }
      } catch (error) {
        // Silently handle errors to avoid breaking user experience
      }
    }

    // Delay the tracking slightly to avoid counting quick bounces
    const timer = setTimeout(trackView, 1000)

    return () => clearTimeout(timer)
  }, [postId, supabase, tracked])

  // This component doesn't render anything visible
  return null
}
