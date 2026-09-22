import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import heroImage from '@/public/maltaguns-hero-2.jpg'
import { HomeTrustRail } from './HomeTrustRail'

interface HeroSectionProps {
  isAuthenticated: boolean
}

export const HeroSection = ({ isAuthenticated }: HeroSectionProps) => {
  return (
    <section className="relative isolate -mt-[var(--header-height)] min-h-[85dvh] flex flex-col justify-end">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={heroImage}
          alt="MaltaGuns Hero"
          fill
          fetchPriority="high"
          loading="eager"
          sizes="100vw"
          quality={75}
          className="object-cover object-[68%_center] lg:object-center"
          placeholder="blur"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-zinc-950/92 to-black/78 lg:from-black/90 lg:via-zinc-950/85 lg:to-black/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/88 to-black/50 lg:from-black/95 lg:via-black/72 lg:to-transparent" />
        <div
          className="home-blueprint pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div
          className="home-noise pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-6 pb-16 pt-32 lg:pb-20 lg:pt-40">
        <div className="home-hero-enter max-w-2xl text-center lg:text-left">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--home-brand)] drop-shadow-md">
            Malta firearms marketplace
          </p>
          <h1 className="home-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl lg:text-6xl text-balance drop-shadow-lg">
            Licensed firearms and gear across Malta
          </h1>
          <p className="mt-5 text-base leading-relaxed text-zinc-100 sm:text-lg max-w-prose mx-auto lg:mx-0">
            Buy, sell, and connect with verified sellers. Browse active
            listings, find local dealers, and track community events.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
            <Link
              href={isAuthenticated ? '/marketplace/create' : '/register'}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto rounded-sm bg-[var(--home-brand)] text-white hover:bg-[var(--home-brand-deep)] border-0 font-semibold uppercase tracking-wide text-xs"
              >
                {isAuthenticated ? 'Post a listing' : 'Create account'}
              </Button>
            </Link>
            <Link href="/marketplace" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-sm border-white bg-white text-black hover:bg-white/90 hover:text-black uppercase tracking-wide text-xs"
              >
                Browse marketplace
              </Button>
            </Link>
          </div>
        </div>
        <HomeTrustRail />
      </div>
    </section>
  )
}
