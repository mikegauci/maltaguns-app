import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ctaImage from '@/public/maltaguns-hero.jpg'

interface CTASectionProps {
  isAuthenticated: boolean
}

export const CTASection = ({ isAuthenticated }: CTASectionProps) => {
  return (
    <section className="relative overflow-hidden border-t border-[var(--home-border)] bg-[var(--home-surface)] py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col justify-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--home-amber)]">
              Get started
            </p>
            <h2 className="home-display text-2xl md:text-3xl font-bold uppercase tracking-tight text-[var(--home-ink)] text-balance">
              Ready to list or browse?
            </h2>
            <p className="mt-3 text-sm text-[var(--home-muted)] max-w-prose">
              Create an account to buy and sell with verified members, or browse
              active listings across Malta.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href={isAuthenticated ? '/marketplace/create' : '/register'}
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-sm bg-[var(--home-brand)] text-white hover:bg-[var(--home-brand-deep)] uppercase tracking-wide text-xs font-semibold"
                >
                  {isAuthenticated ? 'Post a listing' : 'Create account'}
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto rounded-sm border-white bg-white text-black hover:bg-white/90 hover:text-black uppercase tracking-wide text-xs font-semibold"
                >
                  Browse marketplace
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative min-h-[240px] overflow-hidden rounded-sm border border-[var(--home-border)] lg:min-h-[320px]">
            <Image
              src={ctaImage}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/40 to-[var(--home-bg)]/90" />
            <div
              className="home-blueprint pointer-events-none absolute inset-0"
              aria-hidden="true"
            />
            <span className="home-callout absolute bottom-4 right-4 hidden sm:inline-flex">
              Verified marketplace
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
