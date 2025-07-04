'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  timeout?: number // timeout in milliseconds
  message?: string
}

export function LoadingState({
  timeout = 2000,
  message = 'Loading...',
}: LoadingStateProps) {
  const router = useRouter()
  const [showRetryButton, setShowRetryButton] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRetryButton(true)
    }, timeout)

    return () => clearTimeout(timer)
  }, [timeout])

  const handleRetry = () => {
    // Force a hard refresh
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-muted-foreground">{message}</p>
      </div>

      {showRetryButton && (
        <button
          onClick={handleRetry}
          className="text-sm text-primary hover:underline"
        >
          Taking too long? Click to refresh
        </button>
      )}
    </div>
  )
}
