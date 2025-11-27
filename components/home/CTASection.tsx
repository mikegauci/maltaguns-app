import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CTASectionProps {
  isAuthenticated: boolean
}

export const CTASection = ({ isAuthenticated }: CTASectionProps) => {
  return (
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-primary-foreground mb-4">
          Join the MaltaGuns Community Today
        </h2>
        <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
          Ready to get started? <strong>Join MaltaGuns</strong> today! Create
          an account to buy, sell, and connect with other firearm enthusiasts.
          Be part of our <strong>community</strong>!
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href={isAuthenticated ? '/marketplace/create' : '/register'}>
            <Button size="lg" variant="secondary">
              {isAuthenticated ? 'Post a Listing' : 'Create Account'}
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button size="lg" variant="secondary">
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

