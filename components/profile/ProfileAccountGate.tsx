'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BackButton } from '@/components/ui/back-button'
import { LoadingState } from '@/components/ui/loading-state'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useProfileContext } from '@/components/profile/ProfileDataProvider'

export function ProfileAccountGate({
  children,
}: {
  children: React.ReactNode
}) {
  const { session } = useSupabase()
  const { loading, profile } = useProfileContext()

  if (!session?.user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Access</CardTitle>
            <CardDescription>
              You need to log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link href="/login">
                <Button className="w-full">Log In</Button>
              </Link>
              <BackButton
                label="Back to Home"
                href="/"
                hideLabelOnMobile={false}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading || !profile) {
    return <LoadingState message="Loading profile..." />
  }

  return <>{children}</>
}
