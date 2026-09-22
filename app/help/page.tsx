import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { PageLayout } from '@/components/ui/page-layout'
import { HelpCenterTabs } from '@/components/help/HelpCenterTabs'
import { fetchPublishedHelpCenter } from '@/lib/help-center'

export default async function HelpPage() {
  const tabs = await fetchPublishedHelpCenter()

  return (
    <PageLayout>
      <PageHeader
        title="Help Center"
        description="Find guides, tutorials, FAQs, and support resources to help you get the most out of MaltaGuns."
      />

      <div className="max-w-4xl mx-auto">
        <HelpCenterTabs tabs={tabs} />

        <div className="text-center mt-12 pt-8 border-t">
          <h2 className="text-2xl font-semibold mb-4">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="text-muted-foreground mb-6">
            Our support team is ready to assist you with any questions or
            issues.
          </p>
          <Link href="/contact">
            <Button>Contact Support</Button>
          </Link>
        </div>
      </div>
    </PageLayout>
  )
}
