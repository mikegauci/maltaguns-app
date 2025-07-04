'use client'

import { ReactNode, useEffect, useState } from 'react'

interface ClientAdminLayoutProps {
  children: ReactNode
}

export function ClientAdminLayout({ children }: ClientAdminLayoutProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6">{children}</div>
    </div>
  )
}
