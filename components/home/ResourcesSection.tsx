import Link from 'next/link'
import { BookOpen, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HomeSectionHeader } from './HomeSectionHeader'
import { HomeSectionShell } from './HomeSectionShell'

export const ResourcesSection = () => {
  return (
    <HomeSectionShell tone="default">
      <HomeSectionHeader
        title="Guides and news"
        description="Licensing requirements, safety resources, and regulatory updates for firearm owners in Malta."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <Link href="/blog/guides" className="group block h-full">
          <div className="home-card h-full rounded-sm p-5 md:p-6 flex flex-col bg-[var(--home-surface)]">
            <div className="home-icon-badge mb-4 border border-[var(--home-border)] bg-[var(--home-slate)] text-[var(--home-amber)]">
              <BookOpen aria-hidden="true" />
            </div>
            <h3 className="home-display font-bold uppercase tracking-tight text-base md:text-lg text-[var(--home-ink)] mb-2">
              Guides and resources
            </h3>
            <p className="text-sm text-[var(--home-muted)] flex-1 mb-4">
              Licensing steps, safety regulations, and maintenance advice for
              firearm owners in Malta.
            </p>
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-sm border-white bg-white text-black hover:bg-white/90 hover:text-black uppercase tracking-wide text-xs font-semibold"
            >
              Browse guides
            </Button>
          </div>
        </Link>

        <Link href="/blog/news" className="group block h-full">
          <div className="home-card h-full rounded-sm p-5 md:p-6 flex flex-col bg-[var(--home-surface)]">
            <div className="home-icon-badge mb-4 border border-[var(--home-border)] bg-[var(--home-slate)] text-[var(--home-amber)]">
              <Newspaper aria-hidden="true" />
            </div>
            <h3 className="home-display font-bold uppercase tracking-tight text-base md:text-lg text-[var(--home-ink)] mb-2">
              Latest news
            </h3>
            <p className="text-sm text-[var(--home-muted)] flex-1 mb-4">
              Announcements and regulatory updates affecting the firearms
              community in Malta.
            </p>
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-sm border-white bg-white text-black hover:bg-white/90 hover:text-black uppercase tracking-wide text-xs font-semibold"
            >
              Read news
            </Button>
          </div>
        </Link>
      </div>
    </HomeSectionShell>
  )
}
