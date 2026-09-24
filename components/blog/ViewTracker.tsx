'use client'

import { useEffect, useState } from 'react'

interface ViewTrackerProps {
  postId: string
}

export default function ViewTracker({ postId }: ViewTrackerProps) {
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    const trackView = async () => {
      if (tracked) return

      try {
        const response = await fetch('/api/blog/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId }),
        })

        if (response.ok) {
          setTracked(true)
        }
      } catch (error) {}
    }

    const timer = setTimeout(trackView, 1000)

    return () => clearTimeout(timer)
  }, [postId, tracked])

  return null
}
