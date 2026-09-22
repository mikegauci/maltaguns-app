'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackButtonProps {
  label?: string
  href: string
  className?: string
  hideLabelOnMobile?: boolean
}

export function BackButton({
  label = 'Back',
  href,
  className,
  hideLabelOnMobile = true,
}: BackButtonProps) {
  const router = useRouter()

  const wrapperClasses = hideLabelOnMobile
    ? 'absolute md:top-0.5 top-0 right-auto left-auto'
    : ''

  const labelClasses = hideLabelOnMobile ? 'hidden md:inline' : ''

  const buttonClasses = hideLabelOnMobile
    ? 'w-[32px] h-[32px] md:w-auto md:h-auto flex items-center justify-center text-muted-foreground hover:text-foreground md:p-2 p-0'
    : 'flex items-center justify-center text-muted-foreground hover:text-foreground'

  const iconClasses = hideLabelOnMobile ? 'h-4 w-4 md:mr-2' : 'h-4 w-4 mr-2'

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(href)
    }
  }

  return (
    <div className={wrapperClasses}>
      <Button
        type="button"
        variant="outline"
        className={`${buttonClasses} ${className || ''}`}
        onClick={handleClick}
      >
        <ArrowLeft className={iconClasses} />
        <span className={labelClasses}>{label}</span>
      </Button>
    </div>
  )
}
