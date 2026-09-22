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
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-4 border-b border-amber-700 bg-amber-950/95 px-4 py-2 text-sm font-medium text-amber-100">
      <span>
        Viewing as <strong>{targetUsername}</strong> (admin: {adminUsername})
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStop}
        disabled={isStopping}
        className="border-amber-600 bg-amber-900/50 text-amber-100 hover:bg-amber-900 hover:text-amber-50"
      >
        {isStopping ? 'Stopping…' : 'Stop impersonating'}
      </Button>
    </div>
  )
}
