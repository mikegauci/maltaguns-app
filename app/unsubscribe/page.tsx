import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageLayout } from '@/components/ui/page-layout'

export default async function UnsubscribePage(props: {
  searchParams: Promise<{ status?: string }>
}) {
  const searchParams = await props.searchParams
  const success = searchParams.status === 'ok'

  return (
    <PageLayout className="flex items-center justify-center">
      <Card className="max-w-xl rounded-sm border-border p-8 text-center shadow-none">
        {success ? (
          <>
            <h1 className="app-display mb-3 text-2xl font-bold uppercase tracking-tight">
              You&apos;re unsubscribed
            </h1>
            <p className="text-muted-foreground">
              You will no longer receive emails when a new article is published.
              You'll still see new articles in your on-site notifications.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Changed your mind? You can turn these emails back on anytime from
              your profile.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/profile">Go to profile</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="app-display mb-3 text-2xl font-bold uppercase tracking-tight">
              Link not valid
            </h1>
            <p className="text-muted-foreground">
              This unsubscribe link is invalid or has expired. You can manage
              your email preferences from your profile instead.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/profile">Go to profile</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </>
        )}
      </Card>
    </PageLayout>
  )
}
