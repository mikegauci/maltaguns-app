import type { ReactNode } from 'react'
import './print.css'
import { PrintButton } from './print-button'

export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <div className="print-root" data-theme="light">
      <PrintButton />
      {children}
    </div>
  )
}
