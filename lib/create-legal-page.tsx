import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalPageView } from '@/components/legal/LegalPageView'
import { getLegalPageSeoKey, type LegalPageSlug } from '@/lib/legal-pages'
import { getLegalPage } from '@/lib/legal-pages.server'
import { getSectionMetadata } from '@/lib/seo'

export function createLegalPage(slug: LegalPageSlug) {
  const seoKey = getLegalPageSeoKey(slug)

  async function generateMetadata(): Promise<Metadata> {
    return getSectionMetadata(seoKey)
  }

  async function LegalPage() {
    const page = await getLegalPage(slug)
    if (!page) notFound()
    return <LegalPageView page={page} />
  }

  return { generateMetadata, default: LegalPage }
}
