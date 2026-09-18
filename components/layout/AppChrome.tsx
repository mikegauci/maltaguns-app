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
      <Header />
      <main
        className={
          impersonation
            ? 'min-h-[calc(100vh-64px-40px)]'
            : 'min-h-[calc(100vh-64px)]'
        }
      >
        {children}
      </main>
      <Footer />
    </>
  )
}
