import Link from 'next/link'
import { AppAlert } from '@/components/design-system'
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
      <AppAlert variant="pending" title="Awaiting approval">
        Your dealer licence ({licenceNumber ?? 'not provided'}) is being checked
        by the platform admin. You can complete your{' '}
        <Link
          href="/profile/armory/company-profile"
          className="font-medium underline"
        >
          company profile
        </Link>{' '}
        now; shipments and inventory unlock once approved.
      </AppAlert>
    )
  }

  if (accountStatus === 'SUSPENDED') {
    return (
      <AppAlert variant="rejected" title="Account suspended">
        {statusNote ?? 'Contact the platform admin.'} Your data is retained but
        read-only.
      </AppAlert>
    )
  }

  if (licenceExpiry) {
    const days = daysUntil(licenceExpiry)
    if (days < 60) {
      return (
        <AppAlert variant="pending">
          Dealer licence{' '}
          {days < 0 ? `expired ${-days} days ago` : `expires in ${days} days`} (
          {licenceExpiry}). Update it in your company profile once renewed.
        </AppAlert>
      )
    }
  }

  return null
}
