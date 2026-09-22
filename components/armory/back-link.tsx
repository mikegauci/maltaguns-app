import Link from 'next/link'
import type { ReactNode } from 'react'

export function BackLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link href={href} className="text-xs text-muted-foreground hover:underline">
      ← {children}
    </Link>
  )
}
