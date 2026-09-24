'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  getVerifiedTotpFactors,
  unenrollUnverifiedTotpFactors,
} from '@/lib/admin-mfa'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

const MFA_FRIENDLY_NAME = 'MaltaGuns Admin'

async function prepareMfaEnrollment(
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

  const verifiedFactor = getVerifiedTotpFactors(factors)[0]

  if (verifiedFactor) {
    router.replace('/admin/security/mfa/verify')
    return { redirected: true } as const
  }

  const clearResult = await unenrollUnverifiedTotpFactors(supabase)
  if ('error' in clearResult) {
    return clearResult
  }

  let enrollResult = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: MFA_FRIENDLY_NAME,
  })

  if (
    enrollResult.error?.message.includes('already exists') ||
    enrollResult.error?.message.includes('friendly name')
  ) {
    const retryClear = await unenrollUnverifiedTotpFactors(supabase)
    if ('error' in retryClear) {
      return retryClear
    }

    enrollResult = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: MFA_FRIENDLY_NAME,
    })
  }

  if (enrollResult.error) {
    return { error: enrollResult.error.message } as const
  }

  const { data } = enrollResult

  if (!data) {
    return { error: 'Failed to start MFA setup' } as const
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: data.id })

  return {
    factorId: data.id,
    qrCode: data.totp?.qr_code,
    secret: data.totp?.secret,
    challengeId: challengeError ? undefined : challenge.id,
    error: challengeError?.message,
  } as const
}

export default function AdminMfaEnrollPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const enrollmentRef = useRef<ReturnType<typeof prepareMfaEnrollment> | null>(
    null
  )
  const [factorId, setFactorId] = useState<string>()
  const [challengeId, setChallengeId] = useState<string>()
  const [qrCode, setQrCode] = useState<string>()
  const [secret, setSecret] = useState<string>()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEnrollment = useCallback(
    async (force = false) => {
      setIsLoading(true)
      setError(null)
      setCode('')

      if (force) {
        enrollmentRef.current = null
      }

      if (!enrollmentRef.current) {
        enrollmentRef.current = prepareMfaEnrollment(supabase, router).finally(
          () => {
            enrollmentRef.current = null
          }
        )
      }

      const result = await enrollmentRef.current

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
        setQrCode(result.qrCode)
        setSecret(result.secret)
        setChallengeId(result.challengeId)
        if (result.error) {
          setError(result.error)
        }
      }

      setIsLoading(false)
    },
    [router, supabase]
  )

  useEffect(() => {
    void loadEnrollment()
  }, [loadEnrollment])

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
      title: 'Two-factor authentication enabled',
      description:
        'Your authenticator app is now linked to your admin account.',
    })

    router.replace('/admin')
    router.refresh()
  }

  return (
    <AppCard className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set up two-factor authentication</CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app. This is required for
          admin access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error && !qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void loadEnrollment(true)}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Use Google Authenticator, 1Password, or another TOTP app.
            </p>
            {qrCode && (
              <div className="flex justify-center">
                <img
                  src={qrCode}
                  alt="TOTP QR code"
                  width={200}
                  height={200}
                  className="h-[200px] w-[200px]"
                />
              </div>
            )}
            {secret && (
              <p className="break-all text-center text-xs text-muted-foreground">
                Manual entry key: {secret}
              </p>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Enter the 6-digit code</p>
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
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleVerify}
                disabled={isVerifying || code.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Enable 2FA'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => void loadEnrollment(true)}
                disabled={isVerifying}
              >
                Refresh QR
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </AppCard>
  )
}
