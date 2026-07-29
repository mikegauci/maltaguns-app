'use client'

import nextDynamic from 'next/dynamic'

export const AdminDataTable = nextDynamic(
  () => import('./DataTable').then(m => m.DataTable),
  { ssr: false }
) as typeof import('./DataTable').DataTable
