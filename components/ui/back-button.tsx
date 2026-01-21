import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackButtonProps {
  label?: string
  href: string
  className?: string
  hideLabelOnMobile?: boolean
}

/**
 * Reusable back button component with consistent styling across the app
 * Uses Next.js Link for optimal SEO, accessibility, and UX.
 *
 * @example
 * <BackButton label="Back to blog" href="/blog" />
 * <BackButton label="Back to post" href="/blog/news/my-post" hideLabelOnMobile={false} />
 */
export function BackButton({
  label = 'Back',
  href,
  className,
  hideLabelOnMobile = true,
}: BackButtonProps) {
  const wrapperClasses = hideLabelOnMobile
    ? 'absolute md:top-0.5 top-0 right-auto left-auto'
    : ''

  const labelClasses = hideLabelOnMobile ? 'hidden md:inline' : ''

  const buttonClasses = hideLabelOnMobile
    ? 'w-[32px] h-[32px] md:w-auto md:h-auto flex items-center justify-center text-muted-foreground hover:text-foreground md:p-2 p-0'
    : 'flex items-center justify-center text-muted-foreground hover:text-foreground'

  const iconClasses = hideLabelOnMobile ? 'h-4 w-4 md:mr-2' : 'h-4 w-4 mr-2'

  return (
    <div className={wrapperClasses}>
      <Link href={href}>
        <Button
          variant="outline"
          className={`${buttonClasses} ${className || ''}`}
        >
          <ArrowLeft className={iconClasses} />
          <span className={labelClasses}>{label}</span>
        </Button>
      </Link>
    </div>
  )
}
