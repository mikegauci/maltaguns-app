'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

interface AppChromeProps {
  children: React.ReactNode
  impersonation: boolean
}

export function AppChrome({ children, impersonation }: AppChromeProps) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <Header impersonation={impersonation} />
      <main
        className={
          impersonation
            ? 'min-h-[calc(100vh-var(--header-height)-2.5rem)] pt-[var(--header-height)]'
            : 'min-h-[calc(100vh-var(--header-height))] pt-[var(--header-height)]'
        }
      >
        {children}
      </main>
      <Footer />
    </>
  )
}
