'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type ImpersonationBannerProps = {
  adminUsername: string
  targetUsername: string
}

export function ImpersonationBanner({
  adminUsername,
  targetUsername,
}: ImpersonationBannerProps) {
  const { toast } = useToast()
  const [isStopping, setIsStopping] = useState(false)

  async function handleStop() {
    setIsStopping(true)
    try {
      const response = await fetch('/api/admin/impersonate/stop', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to stop impersonating')
      }

      window.location.href = '/admin/users'
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not stop impersonating',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to stop impersonating',
      })
      setIsStopping(false)
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-4 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>
        Viewing as <strong>{targetUsername}</strong> (admin: {adminUsername})
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStop}
        disabled={isStopping}
        className="border-amber-700 bg-amber-50 text-amber-950 hover:bg-amber-100"
      >
        {isStopping ? 'Stopping…' : 'Stop impersonating'}
      </Button>
    </div>
  )
}
