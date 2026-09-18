import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

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

  let verified = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('identity_verified')
      .eq('id', user.id)
      .single()

    verified = profile?.identity_verified ?? false
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl">
      <Card className="p-8 text-center">
        {verified ? (
          <>
            <h1 className="text-2xl font-bold mb-3">Identity verified</h1>
            <p className="text-muted-foreground">
              Thanks — your identity has been verified. You can now list and
              contact sellers of firearms, provided your firearms license is
              also verified.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-3">
              Thanks, we&apos;re checking your details
            </h1>
            <p className="text-muted-foreground">
              Your verification has been submitted. Results usually arrive
              within a minute, and some checks are reviewed manually. Your
              profile will update automatically once it completes.
            </p>
          </>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/profile">Go to profile</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
