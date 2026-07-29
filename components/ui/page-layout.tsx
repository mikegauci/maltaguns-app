import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background md:py-8 py-6 px-4">
      <div className="container mx-auto md:px-4 px-0 relative">{children}</div>
    </div>
  )
}
