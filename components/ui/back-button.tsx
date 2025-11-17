import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackButtonProps {
  /** The text to display after the arrow. Default: "Back" */
  label?: string
  /** The href to navigate to */
  href: string
  /** Optional className for additional styling */
  className?: string
}

/**
 * Reusable back button component with consistent styling across the app
 * Uses Next.js Link for optimal SEO, accessibility, and UX.
 * 
 * @example
 * <BackButton label="Back to blog" href="/blog" />
 * <BackButton label="Back to post" href="/blog/news/my-post" />
 */
export function BackButton({ 
  label = 'Back', 
  href,
  className = '' 
}: BackButtonProps) {
  return (
    <div className={className}>
      <Link href={href}>
        <Button
          variant="ghost"
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </Link>
    </div>
  )
}

