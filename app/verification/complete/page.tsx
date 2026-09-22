import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageLayout } from '@/components/ui/page-layout'
import { createClient } from '@/lib/supabase/server'
import { syncIdentityVerificationForUser } from '@/lib/sync-identity-verification'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Identity verification',
  robots: { index: false, follow: false },
}

export default async function VerificationCompletePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { identity_verified } = await syncIdentityVerificationForUser(user.id)

    if (identity_verified) {
      redirect('/profile')
    }
  }

  return (
    <PageLayout className="flex items-center justify-center">
      <Card className="max-w-xl rounded-sm border-border p-8 text-center shadow-none">
        <h1 className="app-display mb-3 text-2xl font-bold uppercase tracking-tight">
          Thanks, we&apos;re checking your details
        </h1>
        <p className="text-muted-foreground">
          Your verification has been submitted. Results usually arrive within a
          minute, and some checks are reviewed manually. Your profile will
          update automatically once it completes.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/profile">Go to profile</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </Card>
    </PageLayout>
  )
}
