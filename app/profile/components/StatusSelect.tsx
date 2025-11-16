'use client'

import { useState } from 'react'
import { CheckCircle2, ShoppingCart, BanIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export const StatusSelect = ({
  value,
  onChange,
  className,
}: StatusSelectProps) => {
  const [open, setOpen] = useState(false)

  const options = [
    { value: 'active', label: 'Active', icon: CheckCircle2 },
    { value: 'sold', label: 'Sold', icon: ShoppingCart },
    { value: 'inactive', label: 'Inactive', icon: BanIcon },
  ]

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full text-sm border rounded h-9 px-3 bg-white flex items-center sm:justify-start justify-center gap-2 cursor-pointer relative',
          className
        )}
      >
        {selectedOption && (
          <>
            <selectedOption.icon className="h-4 w-4" />
            {selectedOption.label}
          </>
        )}
        <svg
          className="h-4 w-4 sm:static sm:ml-2 absolute right-3"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50',
                  value === option.value && 'bg-gray-50'
                )}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
