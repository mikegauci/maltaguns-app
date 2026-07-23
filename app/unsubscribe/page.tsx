import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const success = searchParams.status === 'ok'

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl">
      <Card className="p-8 text-center">
        {success ? (
          <>
            <h1 className="text-2xl font-bold mb-3">You're unsubscribed</h1>
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
            <h1 className="text-2xl font-bold mb-3">Link not valid</h1>
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
    </div>
  )
}
