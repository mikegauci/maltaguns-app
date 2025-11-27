import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface HeroSectionProps {
  isAuthenticated: boolean
}

export const HeroSection = ({ isAuthenticated }: HeroSectionProps) => {
  return (
    <section className="relative isolate">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/maltaguns-hero-2.jpg"
          alt="MaltaGuns Hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/75"></div>
      </div>
      <div className="relative mx-auto max-w-5xl py-32 sm:py-48 lg:py-56 px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 text-white">
            Welcome to MaltaGuns
          </h1>
          <p className="text-lg leading-8 text-white/80 mb-8">
            The leading destination for firearm enthusiasts in Malta, for both
            experienced shooters and beginners. MaltaGuns connects you with a
            trusted marketplace, expert insights, and a dedicated community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6 w-full sm:w-auto">
            <Link
              href={isAuthenticated ? '/marketplace/create' : '/register'}
              className="w-[80%] sm:w-auto"
            >
              <Button
                variant="secondary"
                size="lg"
                className="border-white w-full"
              >
                {isAuthenticated ? 'Post Listing' : 'Join the Community'}
              </Button>
            </Link>
            <Link href="/marketplace" className="w-[80%] sm:w-auto">
              <Button
                variant="default"
                size="lg"
                className="border border-white w-full"
              >
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
