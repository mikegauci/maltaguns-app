import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { daysUntil } from '@/lib/armory/format'

type ArmoryStatusBannerProps = {
  accountStatus?: string
  licenceNumber?: string
  licenceExpiry?: string | null
  statusNote?: string | null
}

export function ArmoryStatusBanner({
  accountStatus,
  licenceNumber,
  licenceExpiry,
  statusNote,
}: ArmoryStatusBannerProps) {
  if (accountStatus === 'PENDING') {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertDescription className="text-amber-900">
          <strong>Awaiting approval.</strong> Your dealer licence (
          {licenceNumber ?? 'not provided'}) is being checked by the platform
          admin. You can complete your{' '}
          <Link
            href="/profile/armory/company-profile"
            className="font-medium underline"
          >
            company profile
          </Link>{' '}
          now; shipments and inventory unlock once approved.
        </AlertDescription>
      </Alert>
    )
  }

  if (accountStatus === 'SUSPENDED') {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <strong>Account suspended.</strong>{' '}
          {statusNote ?? 'Contact the platform admin.'} Your data is retained
          but read-only.
        </AlertDescription>
      </Alert>
    )
  }

  if (licenceExpiry) {
    const days = daysUntil(licenceExpiry)
    if (days < 60) {
      return (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-900">
            Dealer licence{' '}
            {days < 0 ? `expired ${-days} days ago` : `expires in ${days} days`}{' '}
            ({licenceExpiry}). Update it in your company profile once renewed.
          </AlertDescription>
        </Alert>
      )
    }
  }

  return null
}
