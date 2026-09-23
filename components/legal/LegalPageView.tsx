import { CookieSettingsButton } from '@/components/cookies/CookieSettingsButton'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'
import {
  getLegalPageDefinition,
  formatLegalDate,
  type LegalPage,
} from '@/lib/legal-pages'
import { LEGAL_PAGE_PROSE_CLASS } from '@/lib/rich-text-prose'
import { sanitizeBlogHtml } from '@/lib/sanitize-html'

type LegalPageViewProps = {
  page: LegalPage
}

export function LegalPageView({ page }: LegalPageViewProps) {
  const definition = getLegalPageDefinition(page.slug)
  const effectiveDate = formatLegalDate(page.effective_date)
  const lastUpdated = formatLegalDate(page.last_updated)
  const hasDates = Boolean(effectiveDate || lastUpdated)
  const hasSubtitle = Boolean(definition.subtitle)
  const sanitizedContent = sanitizeBlogHtml(page.content)

  return (
    <PageLayout>
      <PageHeader
        title={page.title}
        className={hasSubtitle || hasDates ? 'mb-4' : 'mb-6'}
      />

      {definition.subtitle ? (
        <p className="text-muted-foreground mb-1">{definition.subtitle}</p>
      ) : null}

      {effectiveDate ? (
        <p className={`text-muted-foreground ${lastUpdated ? 'mb-1' : 'mb-8'}`}>
          Effective Date: {effectiveDate}
        </p>
      ) : null}
      {lastUpdated ? (
        <p className="text-muted-foreground mb-8">
          Last Updated: {lastUpdated}
        </p>
      ) : null}

      <div
        className={LEGAL_PAGE_PROSE_CLASS}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />

      {page.slug === 'cookie-policy' ? (
        <div className="not-prose mt-4">
          <CookieSettingsButton />
        </div>
      ) : null}
    </PageLayout>
  )
}
