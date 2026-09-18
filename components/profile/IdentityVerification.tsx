'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { BadgeCheck, Clock, Loader2, ShieldCheck } from 'lucide-react'

const PENDING_IDENTITY_STATUSES = new Set([
  'In Review',
  'In Progress',
  'Awaiting User',
  'Resubmitted',
])

const POLL_INTERVAL_MS = 5000
const POLL_ATTEMPTS = 24

interface IdentityVerificationProps {
  identityVerified: boolean
  identityStatus: string | null
  identityFirstName: string | null
  identityLastName: string | null
  identityDocumentType: string | null
  identityReviewNotes: string[] | null
  onVerificationChange: (update: {
    identity_verified: boolean
    identity_status: string | null
    identity_first_name: string | null
    identity_last_name: string | null
    identity_document_type: string | null
    identity_review_notes: string[] | null
  }) => void
}

type StatusTone = 'verified' | 'pending' | 'failed' | 'none'

function describeStatus(
  verified: boolean,
  status: string | null
): { label: string; tone: StatusTone } {
  if (verified) return { label: 'Verified', tone: 'verified' }

  switch (status) {
    case 'In Review':
      return { label: 'In review', tone: 'pending' }
    case 'In Progress':
    case 'Awaiting User':
    case 'Resubmitted':
      return { label: 'In progress', tone: 'pending' }
    case 'Declined':
      return { label: 'Declined', tone: 'failed' }
    case 'Expired':
    case 'Kyc Expired':
      return { label: 'Expired', tone: 'failed' }
    case 'Abandoned':
      return { label: 'Not completed', tone: 'none' }
    default:
      return { label: 'Not verified', tone: 'none' }
  }
}

function hasDateOfBirthMismatch(notes: string[]): boolean {
  return notes.some(note =>
    /date of birth|dob|birth.*mismatch/i.test(note)
  )
}

const TONE_CLASSES: Record<StatusTone, string> = {
  verified: 'border-green-600 text-green-600',
  pending: 'border-amber-500 text-amber-500',
  failed: 'border-destructive text-destructive',
  none: 'border-gray-400 text-gray-400',
}

export const IdentityVerification = ({
  identityVerified,
  identityStatus,
  identityFirstName,
  identityLastName,
  identityDocumentType,
  identityReviewNotes,
  onVerificationChange,
}: IdentityVerificationProps) => {
  const { toast } = useToast()
  const [consentOpen, setConsentOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const isMounted = useRef(true)

  const pendingReview =
    !identityVerified &&
    !!identityStatus &&
    PENDING_IDENTITY_STATUSES.has(identityStatus)
  const reviewNotes = identityReviewNotes ?? []
  const inManualReview = identityStatus === 'In Review'

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/verification/status')
      if (!response.ok) return

      const result = await response.json()
      if (!isMounted.current) return

      onVerificationChange({
        identity_verified: result.verified,
        identity_status: result.status,
        identity_first_name: result.firstName,
        identity_last_name: result.lastName,
        identity_document_type: result.documentType,
        identity_review_notes: result.reviewNotes ?? [],
      })

      if (result.verified) {
        toast({
          variant: 'success',
          title: 'Identity verified',
          description: 'Your identity has been verified successfully.',
        })
      }
    } catch {
      return
    }
  }, [onVerificationChange, toast])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!pendingReview) return

    void refreshStatus()

    let attempt = 0
    const intervalId = window.setInterval(() => {
      attempt += 1
      void refreshStatus()
      if (attempt >= POLL_ATTEMPTS) {
        window.clearInterval(intervalId)
      }
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [pendingReview, refreshStatus])

  async function startVerification() {
    setConsentOpen(false)
    setStarting(true)

    try {
      const response = await fetch('/api/verification/session', {
        method: 'POST',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start verification')
      }

      if (
        typeof result.url !== 'string' ||
        !/^https:\/\/verify\.didit\.me\//.test(result.url)
      ) {
        throw new Error('Invalid verification URL received')
      }

      window.location.assign(result.url)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not start verification',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to start verification.',
      })
    } finally {
      setStarting(false)
    }
  }

  const { label, tone } = describeStatus(identityVerified, identityStatus)
  const verifiedName = [identityFirstName, identityLastName]
    .filter(Boolean)
    .join(' ')
  const busy = starting
  const canStartVerification =
    !identityVerified && !pendingReview && !busy

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-xs ${TONE_CLASSES[tone]}`}>
          {label}
        </Badge>
      </div>

      {identityVerified ? (
        <div className="rounded-md border bg-muted/20 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BadgeCheck className="h-4 w-4 text-green-600" />
            <span>Identity confirmed by Didit</span>
          </div>
          {verifiedName && (
            <p className="text-xs text-muted-foreground">
              Verified as {verifiedName}
              {identityDocumentType
                ? ` · ${identityDocumentType.replace(/_/g, ' ').toLowerCase()}`
                : ''}
            </p>
          )}
        </div>
      ) : inManualReview ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-start gap-2 text-sm font-medium text-amber-900">
            <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Your verification is being reviewed</span>
          </div>
          <p className="text-xs text-amber-800">
            Didit flagged your submission for manual review. This usually takes
            a short time and your profile will update automatically once a
            decision is made.
          </p>
          {reviewNotes.length > 0 && (
            <ul className="text-xs text-amber-800 list-disc pl-5 space-y-1">
              {reviewNotes.map(note => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          {hasDateOfBirthMismatch(reviewNotes) && (
            <p className="text-xs text-amber-800">
              Check that your date of birth on your profile matches your ID
              exactly. If it is wrong, update it in your profile details and
              contact{' '}
              <a
                href="mailto:Info@maltaguns.com"
                className="underline font-medium"
              >
                Info@maltaguns.com
              </a>{' '}
              if you need help.
            </p>
          )}
        </div>
      ) : pendingReview ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-start gap-2 text-sm font-medium text-amber-900">
            <Loader2 className="h-4 w-4 flex-shrink-0 mt-0.5 animate-spin" />
            <span>Verification in progress</span>
          </div>
          <p className="text-xs text-amber-800">
            We are waiting for Didit to finish processing your submission. This
            page will update automatically.
          </p>
        </div>
      ) : (
        <>
          <Button
            onClick={() => setConsentOpen(true)}
            disabled={!canStartVerification}
            className="w-full sm:w-auto"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            {starting ? 'Opening...' : 'Verify my identity'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Verify your ID card, passport or residence permit with our identity
            provider Didit. It takes about two minutes and needs your camera.
          </p>
        </>
      )}

      <AlertDialog open={consentOpen} onOpenChange={setConsentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify your identity</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  You will be redirected to <strong>Didit</strong>, our
                  identity verification provider, to photograph your
                  government-issued ID and take a short selfie for a liveness
                  and face match check.
                </p>
                <p>
                  Didit processes your document and biometric data as our
                  processor to confirm you are who you say you are. MaltaGuns
                  receives only the verification outcome, the name on your
                  document and the document type. We never see or store your
                  document images.
                </p>
                <p>
                  The name and date of birth on your document must match your
                  MaltaGuns profile.
                </p>
                <p className="text-muted-foreground">
                  See our{' '}
                  <a href="/privacy" className="underline" target="_blank">
                    privacy policy
                  </a>{' '}
                  for how we handle verification data.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={startVerification}>
              I agree, continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
