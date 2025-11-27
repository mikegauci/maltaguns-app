import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard - MaltaGuns',
  description: 'Admin dashboard for MaltaGuns content management',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
