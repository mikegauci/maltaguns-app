'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AppCard } from '@/components/design-system'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { getVerifiedTotpFactors } from '@/lib/admin-mfa'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

async function createMfaChallenge(
  supabase: SupabaseClient,
  router: ReturnType<typeof useRouter>
) {
  const { data: factors, error: factorsError } =
    await supabase.auth.mfa.listFactors()

  if (factorsError) {
    return { error: factorsError.message } as const
  }

  if (!factors) {
    return { error: 'Failed to load MFA factors' } as const
  }

  const totpFactor = getVerifiedTotpFactors(factors)[0]

  if (!totpFactor) {
    router.replace('/admin/security/mfa')
    return { redirected: true } as const
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: totpFactor.id })

  return {
    factorId: totpFactor.id,
    challengeId: challengeError ? undefined : challenge.id,
    error: challengeError?.message,
  } as const
}

export default function AdminMfaVerifyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const [factorId, setFactorId] = useState<string>()
  const [challengeId, setChallengeId] = useState<string>()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChallenge = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setCode('')

    const result = await createMfaChallenge(supabase, router)

    if ('redirected' in result && result.redirected) {
      return
    }

    if ('error' in result && result.error && !('factorId' in result)) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    if ('factorId' in result) {
      setFactorId(result.factorId)
      setChallengeId(result.challengeId)
      if (result.error) {
        setError(result.error)
      }
    }

    setIsLoading(false)
  }, [router, supabase])

  useEffect(() => {
    void loadChallenge()
  }, [loadChallenge])

  async function handleVerify() {
    if (!factorId || !challengeId || code.length !== 6) return

    setIsVerifying(true)
    setError(null)

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    })

    if (verifyError) {
      setError(verifyError.message)
      setIsVerifying(false)
      return
    }

    toast({
      title: 'Verified',
      description: 'Two-factor authentication complete.',
    })

    router.replace('/admin')
    router.refresh()
  }

  return (
    <AppCard className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify two-factor authentication</CardTitle>
        <CardDescription>
          Enter the code from your authenticator app to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleVerify}
                disabled={isVerifying || code.length !== 6 || !challengeId}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => void loadChallenge()}
                disabled={isVerifying}
              >
                New code
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </AppCard>
  )
}
