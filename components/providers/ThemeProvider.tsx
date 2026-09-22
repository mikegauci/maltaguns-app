'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

function shouldUseDarkTheme(pathname: string) {
  if (pathname.startsWith('/admin')) return false
  if (pathname.startsWith('/profile/armory/print')) return false
  return true
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    const root = document.documentElement
    if (shouldUseDarkTheme(pathname)) {
      root.classList.add('app-dark')
    } else {
      root.classList.remove('app-dark')
    }
  }, [pathname])

  return <>{children}</>
}
