import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditButtonProps {
  label?: string
  href: string
  className?: string
  hideLabelOnMobile?: boolean
}

/**
 * Reusable edit button component with consistent styling across the app
 * Uses Next.js Link for optimal SEO, accessibility, and UX.
 *
 * @example
 * <EditButton label="Edit Profile" href="/establishments/stores/my-store/edit" />
 * <EditButton label="Edit Post" href="/blog/news/my-post/edit" hideLabelOnMobile={false} />
 */
export function EditButton({
  label = 'Edit',
  href,
  className,
  hideLabelOnMobile = true,
}: EditButtonProps) {
  const labelClasses = hideLabelOnMobile ? 'hidden md:inline' : ''

  const buttonClasses = hideLabelOnMobile
    ? 'w-[32px] h-[32px] md:w-auto md:h-[40px] flex items-center justify-center md:px-[16px] md:py-[8px] p-0'
    : 'flex items-center justify-center'

  const iconClasses = hideLabelOnMobile ? 'h-4 w-4 md:mr-2' : 'h-4 w-4 mr-2'

  return (
    <Link href={href}>
      <Button
        variant="outline"
        className={`rounded-sm ${buttonClasses} ${className || ''}`}
      >
        <Pencil className={iconClasses} />
        <span className={labelClasses}>{label}</span>
      </Button>
    </Link>
  )
}
