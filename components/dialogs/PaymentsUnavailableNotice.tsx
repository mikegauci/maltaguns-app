import { SUPPORT_EMAIL } from '@/lib/payment-support'

interface PaymentsUnavailableNoticeProps {
  action: string
}

export function PaymentsUnavailableNotice({
  action,
}: PaymentsUnavailableNoticeProps) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Online payments are temporarily unavailable. To {action}, contact{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="underline font-medium">
        {SUPPORT_EMAIL}
      </a>
      .
    </div>
  )
}
