import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalPageView } from '@/components/legal/LegalPageView'
import {
  getLegalPagePath,
  isBuiltInLegalPageSlug,
  isValidCustomLegalSlug,
} from '@/lib/legal-pages'
import { getLegalPage } from '@/lib/legal-pages.server'
import { buildMetadata } from '@/lib/seo'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = isValidCustomLegalSlug(slug) ? await getLegalPage(slug) : null
  if (!page) return {}
  return buildMetadata({
    title: page.title,
    path: getLegalPagePath(slug),
    noIndex: true,
  })
}

export default async function CustomLegalPage({ params }: PageProps) {
  const { slug } = await params
  if (isBuiltInLegalPageSlug(slug) || !isValidCustomLegalSlug(slug)) notFound()
  const page = await getLegalPage(slug)
  if (!page) notFound()
  return <LegalPageView page={page} />
}
