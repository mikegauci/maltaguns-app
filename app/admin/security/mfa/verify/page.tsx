'use client'

import {
  type ComponentRef,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
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
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { getVerifiedTotpFactors } from '@/lib/admin-mfa'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ShieldCheck } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

const otpSlotClassName =
  'h-12 w-11 rounded-md border border-input bg-background text-lg font-semibold tabular-nums first:rounded-md first:border-l last:rounded-md'

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
  const otpInputRef = useRef<ComponentRef<typeof InputOTP>>(null)
  const canVerify = Boolean(
    factorId && challengeId && code.length === 6 && !isVerifying
  )

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

  useEffect(() => {
    if (!isLoading) {
      otpInputRef.current?.focus()
    }
  }, [isLoading])

  const handleVerify = useCallback(async () => {
    if (!factorId || !challengeId || code.length !== 6 || isVerifying) return

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
  }, [challengeId, code, factorId, isVerifying, router, supabase, toast])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await handleVerify()
  }

  return (
    <AppCard className="w-full max-w-md">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/40">
          <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <CardTitle>Verify two-factor authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to continue.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label
                htmlFor="mfa-verify-code"
                className="block text-center text-sm font-medium text-foreground"
              >
                Authentication code
              </label>
              <InputOTP
                ref={otpInputRef}
                id="mfa-verify-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern={REGEXP_ONLY_DIGITS}
                maxLength={6}
                value={code}
                onChange={setCode}
                containerClassName="justify-center gap-3"
                disabled={isVerifying}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className={otpSlotClassName} />
                  <InputOTPSlot index={1} className={otpSlotClassName} />
                  <InputOTPSlot index={2} className={otpSlotClassName} />
                </InputOTPGroup>
                <InputOTPSeparator className="text-muted-foreground" />
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={3} className={otpSlotClassName} />
                  <InputOTPSlot index={4} className={otpSlotClassName} />
                  <InputOTPSlot index={5} className={otpSlotClassName} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error ? (
              <p className="text-center text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Press Enter to verify once all digits are entered.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={!canVerify}>
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
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => void loadChallenge()}
                disabled={isVerifying}
              >
                Request new code
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </AppCard>
  )
}
