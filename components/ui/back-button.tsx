'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canUseBrowserBack, getSafeInternalPath } from '@/lib/navigation'

interface BackButtonProps {
  label?: string
  href: string
  className?: string
  hideLabelOnMobile?: boolean
  preferHref?: boolean
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function BackButton({
  label = 'Back',
  href,
  className,
  hideLabelOnMobile = false,
  preferHref = false,
  size,
}: BackButtonProps) {
  const router = useRouter()
  const fallbackHref = getSafeInternalPath(href, '/')

  const labelClasses = hideLabelOnMobile ? 'hidden md:inline' : ''

  const buttonClasses = hideLabelOnMobile
    ? 'w-[32px] h-[32px] md:w-auto md:h-auto flex items-center justify-center text-muted-foreground hover:text-foreground md:p-2 p-0'
    : 'flex items-center justify-center text-muted-foreground hover:text-foreground'

  const iconClasses = hideLabelOnMobile ? 'h-4 w-4 md:mr-2' : 'h-4 w-4 mr-2'

  const handleClick = () => {
    if (!preferHref && canUseBrowserBack()) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      aria-label={label}
      className={`rounded-sm ${buttonClasses} ${className || ''}`}
      onClick={handleClick}
    >
      <ArrowLeft className={iconClasses} />
      <span className={labelClasses}>{label}</span>
    </Button>
  )
}
