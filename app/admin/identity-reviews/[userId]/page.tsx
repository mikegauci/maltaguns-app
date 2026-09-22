'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { AdminLoadingState } from '@/app/admin/components/AdminLoadingState'
import { AdminInlineNotice } from '@/components/admin/AdminInlineNotice'
import { AdminPageLayout } from '@/app/admin/components/AdminPageLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { scheduleEffectWork } from '@/lib/schedule-effect-work'
import {
  ACTIONABLE_IDENTITY_STATUSES,
  type AdminIdentityReviewDetail,
  type IdentityReviewMediaKind,
} from '@/lib/didit-admin-types'

const MEDIA_LABELS: Record<IdentityReviewMediaKind, string> = {
  front: 'ID front',
  back: 'ID back',
  portrait: 'Document portrait',
  liveness: 'Selfie',
  face_source: 'Face match source',
  face_target: 'Face match target',
}

export default IdentityReviewDetailPageComponent

function IdentityReviewDetailPageComponent() {
  const params = useParams<{ userId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthorized, isChecking: isCheckingAdmin } = useRequireAdmin({
    preset: 'home-toast',
  })
  const userId = params.userId
  const sessionIdParam = searchParams.get('sessionId')

  const [detail, setDetail] = useState<
    | (AdminIdentityReviewDetail & {
        viewingSessionId?: string
        isCurrentSession?: boolean
      })
    | null
  >(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comment, setComment] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [expandedMedia, setExpandedMedia] = useState<{
    kind: IdentityReviewMediaKind
    label: string
  } | null>(null)

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    try {
      const query = sessionIdParam
        ? `?sessionId=${encodeURIComponent(sessionIdParam)}`
        : ''
      const response = await fetch(
        `/api/admin/identity-reviews/${userId}${query}`
      )
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to load identity review')
      }
      const result = await response.json()
      setDetail(result)
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to load identity review',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [sessionIdParam, toast, userId])

  useEffect(() => {
    if (!isAuthorized) return

    scheduleEffectWork(() => {
      void fetchDetail()
    })
  }, [fetchDetail, isAuthorized])

  async function submitDecision(
    newStatus: 'Approved' | 'Declined' | 'Resubmitted'
  ) {
    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/admin/identity-reviews/${userId}/decision`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newStatus,
            sessionId: detail?.viewingSessionId ?? detail?.decision.sessionId,
            comment: comment.trim() || undefined,
            sendEmail:
              newStatus === 'Declined' || newStatus === 'Resubmitted'
                ? sendEmail
                : false,
          }),
        }
      )

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to submit decision')
      }

      toast({
        title: 'Decision submitted',
        description: `Session marked as ${newStatus}.`,
      })
      router.push('/admin/identity-reviews')
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to submit decision',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingAdmin || isLoading) {
    return (
      <AdminPageLayout
        title="Identity Review"
        description="Inspect verification evidence and submit a compliance decision for this session."
      >
        <AdminLoadingState message="Loading verification evidence..." />
      </AdminPageLayout>
    )
  }

  if (!detail) {
    return (
      <AdminPageLayout
        title="Identity Review"
        description="Inspect verification evidence and submit a compliance decision for this session."
      >
        <p className="text-muted-foreground">Review not found.</p>
      </AdminPageLayout>
    )
  }

  const { profile, decision, viewingSessionId, isCurrentSession } = detail
  const activeSessionId = viewingSessionId ?? decision.sessionId
  const canDecide =
    ACTIONABLE_IDENTITY_STATUSES.has(decision.sessionStatus) &&
    Boolean(isCurrentSession)
  const decisionBlockedReason = !ACTIONABLE_IDENTITY_STATUSES.has(
    decision.sessionStatus
  )
    ? 'This session is not awaiting review. You can inspect the evidence above, but no decision can be submitted.'
    : !isCurrentSession
      ? "This is a historical session. Decisions can only be submitted for the user's current Didit session."
      : null
  const mediaUrl = (kind: IdentityReviewMediaKind) =>
    `/api/admin/identity-reviews/${userId}/media?kind=${kind}&sessionId=${encodeURIComponent(activeSessionId)}`
  const profileName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(' ')
  const documentName = [decision.document.firstName, decision.document.lastName]
    .filter(Boolean)
    .join(' ')
  const availableMedia = decision.media.filter(item => item.available)

  return (
    <AdminPageLayout
      title="Identity Review"
      description="Inspect verification evidence and submit a compliance decision for this session."
    >
      <div className="space-y-6">
        <section className="border rounded-lg p-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{profile.username}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <div className="text-right text-sm">
              <p>
                Status:{' '}
                <span className="font-medium text-amber-600">
                  {decision.sessionStatus}
                </span>
              </p>
              {profile.diditSessionCreatedAt ? (
                <p className="text-muted-foreground">
                  Submitted{' '}
                  {format(new Date(profile.diditSessionCreatedAt), 'PPp')}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              Profile name:{' '}
              <span className="font-medium">{profileName || '—'}</span>
            </p>
            <p>
              Document name:{' '}
              <span className="font-medium">{documentName || '—'}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Session #{decision.sessionNumber ?? '—'}
            {!isCurrentSession ? ' · historical session' : ''} ·{' '}
            <Link href="/admin/users" className="text-blue-600 hover:underline">
              Open users admin
            </Link>
          </p>
        </section>

        {availableMedia.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-base font-semibold">Evidence</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableMedia.map(item => (
                <button
                  key={item.kind}
                  type="button"
                  className="border rounded-lg overflow-hidden text-left hover:ring-2 hover:ring-primary/40 transition"
                  onClick={() =>
                    setExpandedMedia({
                      kind: item.kind,
                      label: MEDIA_LABELS[item.kind],
                    })
                  }
                >
                  <div className="px-3 py-2 text-sm font-medium border-b bg-muted/40">
                    {MEDIA_LABELS[item.kind]}
                  </div>
                  <img
                    src={mediaUrl(item.kind)}
                    alt={MEDIA_LABELS[item.kind]}
                    className="w-full h-48 object-contain bg-black/5"
                  />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="text-base font-semibold">Document details</h3>
            <DetailRow label="Type" value={decision.document.documentType} />
            <DetailRow
              label="Number"
              value={decision.document.documentNumber}
            />
            <DetailRow
              label="Personal number"
              value={decision.document.personalNumber}
            />
            <DetailRow label="DOB" value={decision.document.dateOfBirth} />
            <DetailRow
              label="Age"
              value={
                decision.document.age != null
                  ? String(decision.document.age)
                  : null
              }
            />
            <DetailRow
              label="Nationality"
              value={decision.document.nationality}
            />
            <DetailRow
              label="Issuing country"
              value={
                decision.document.issuingStateName ||
                decision.document.issuingState
              }
            />
            <DetailRow
              label="Issue date"
              value={decision.document.dateOfIssue}
            />
            <DetailRow
              label="Expiry date"
              value={decision.document.expirationDate}
            />
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="text-base font-semibold">Checks</h3>
            {decision.liveness ? (
              <>
                <DetailRow
                  label="Liveness status"
                  value={decision.liveness.status}
                />
                <DetailRow
                  label="Liveness score"
                  value={
                    decision.liveness.score != null
                      ? String(decision.liveness.score)
                      : null
                  }
                />
                <DetailRow
                  label="Face quality"
                  value={
                    decision.liveness.faceQuality != null
                      ? String(decision.liveness.faceQuality)
                      : null
                  }
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No liveness data.</p>
            )}
            {decision.faceMatch ? (
              <>
                <DetailRow
                  label="Face match status"
                  value={decision.faceMatch.status}
                />
                <DetailRow
                  label="Face match score"
                  value={
                    decision.faceMatch.score != null
                      ? String(decision.faceMatch.score)
                      : null
                  }
                />
              </>
            ) : null}
            {decision.ipAnalysis ? (
              <>
                <DetailRow
                  label="IP status"
                  value={decision.ipAnalysis.status}
                />
                <DetailRow
                  label="IP address"
                  value={decision.ipAnalysis.ipAddress}
                />
                <DetailRow
                  label="Country"
                  value={decision.ipAnalysis.country}
                />
                <DetailRow
                  label="VPN"
                  value={
                    decision.ipAnalysis.isVpn == null
                      ? null
                      : decision.ipAnalysis.isVpn
                        ? 'Yes'
                        : 'No'
                  }
                />
                <DetailRow
                  label="Proxy"
                  value={
                    decision.ipAnalysis.isProxy == null
                      ? null
                      : decision.ipAnalysis.isProxy
                        ? 'Yes'
                        : 'No'
                  }
                />
                <DetailRow
                  label="Tor"
                  value={
                    decision.ipAnalysis.isTor == null
                      ? null
                      : decision.ipAnalysis.isTor
                        ? 'Yes'
                        : 'No'
                  }
                />
              </>
            ) : null}
            {decision.amlScreenings.length > 0
              ? decision.amlScreenings.map((screening, index) => (
                  <div key={index} className="pt-2 border-t">
                    <DetailRow
                      label={`AML ${index + 1} status`}
                      value={screening.status}
                    />
                    <DetailRow
                      label={`AML ${index + 1} risk score`}
                      value={
                        screening.riskScore != null
                          ? String(screening.riskScore)
                          : null
                      }
                    />
                    <DetailRow
                      label={`AML ${index + 1} hits`}
                      value={String(screening.hitCount)}
                    />
                  </div>
                ))
              : null}
          </div>
        </section>

        {(decision.warnings.length > 0 || decision.reviewNotes.length > 0) && (
          <section className="border rounded-lg p-4 space-y-3">
            <h3 className="text-base font-semibold">Warnings and notes</h3>
            {decision.warnings.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {decision.warnings.map((warning, index) => (
                  <li
                    key={`${warning.risk}-${index}`}
                    className="space-y-1 rounded-sm border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-amber-100"
                  >
                    <p className="text-sm font-medium">
                      {warning.shortDescription || warning.risk || 'Warning'}
                    </p>
                    {warning.longDescription ? (
                      <p className="text-sm opacity-90">
                        {warning.longDescription}
                      </p>
                    ) : null}
                    {warning.feature ? (
                      <p className="text-xs opacity-80">
                        {warning.feature}
                        {warning.logType ? ` · ${warning.logType}` : ''}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {decision.reviewNotes.length > 0 ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {decision.reviewNotes.map(note => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </section>
        )}

        {canDecide ? (
          <section className="border rounded-lg p-4 space-y-4">
            <h3 className="text-base font-semibold">Decision</h3>
            <div className="space-y-2">
              <Label htmlFor="review-comment">Reviewer comment</Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={event => setComment(event.target.value)}
                placeholder="Optional note stored on the Didit audit trail"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="send-email"
                checked={sendEmail}
                onCheckedChange={checked => setSendEmail(checked === true)}
              />
              <Label htmlFor="send-email">
                Email the user when declining or requesting resubmission
              </Label>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={isSubmitting}
                onClick={() => submitDecision('Approved')}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => submitDecision('Declined')}
              >
                Decline
              </Button>
              <Button
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => submitDecision('Resubmitted')}
              >
                Request resubmission
              </Button>
            </div>
          </section>
        ) : decisionBlockedReason ? (
          <section className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              {decisionBlockedReason}
            </p>
          </section>
        ) : null}
      </div>

      <Dialog
        open={expandedMedia != null}
        onOpenChange={open => {
          if (!open) setExpandedMedia(null)
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{expandedMedia?.label}</DialogTitle>
          </DialogHeader>
          {expandedMedia ? (
            <img
              src={mediaUrl(expandedMedia.kind)}
              alt={expandedMedia.label}
              className="w-full max-h-[70vh] object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span>{value || '—'}</span>
    </p>
  )
}
