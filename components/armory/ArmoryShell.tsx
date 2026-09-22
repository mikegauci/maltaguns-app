import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ArmoryContext } from '@/lib/armory/auth'
import { daysUntil } from '@/lib/armory/format'
import type { DealerAccount } from '@/lib/armory/types'

export type ArmoryNavItem = { href: string; label: string }

type ArmoryShellProps = {
  ctx: ArmoryContext
  nav: ArmoryNavItem[]
  children: React.ReactNode
  banner?: React.ReactNode
}

function buildBanner(ctx: ArmoryContext, account: DealerAccount) {
  if (account.accountStatus === 'PENDING') {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertDescription className="text-amber-900">
          <strong>Awaiting approval.</strong> Your dealer licence (
          {account.dealerLicenceNumber ?? 'not provided'}) is being checked by
          the platform admin. You can complete your{' '}
          <Link
            href="/profile/armory/profile"
            className="underline font-medium"
          >
            company profile
          </Link>{' '}
          now; shipments and inventory unlock once approved.
        </AlertDescription>
      </Alert>
    )
  }
  if (account.accountStatus === 'SUSPENDED') {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <strong>Account suspended.</strong>{' '}
          {account.statusNote ?? 'Contact the platform admin.'} Your data is
          retained but read-only.
        </AlertDescription>
      </Alert>
    )
  }
  if (account.dealerLicenceExpiry) {
    const days = daysUntil(account.dealerLicenceExpiry)
    if (days < 60) {
      return (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-900">
            Dealer licence{' '}
            {days < 0 ? `expired ${-days} days ago` : `expires in ${days} days`}{' '}
            ({account.dealerLicenceExpiry}). Update it in your company profile
            once renewed.
          </AlertDescription>
        </Alert>
      )
    }
  }
  return null
}

export function getArmoryNav(ctx: ArmoryContext): ArmoryNavItem[] {
  const base = '/profile/armory'
  if (!ctx.dealerAccount) {
    return [{ href: `${base}/inventory`, label: 'Inventory' }]
  }
  const items: ArmoryNavItem[] = [
    { href: base, label: 'Shipments' },
    { href: `${base}/inventory`, label: 'Inventory' },
    { href: `${base}/buyers`, label: 'Buyers' },
    { href: `${base}/accounting`, label: 'Accounting' },
    { href: `${base}/documents`, label: 'Documents' },
    { href: `${base}/import`, label: 'Import' },
    { href: `${base}/bin`, label: 'Bin' },
  ]
  if (ctx.staffRole === 'owner') {
    items.push({ href: `${base}/team`, label: 'Team' })
  }
  items.push({ href: `${base}/profile`, label: 'Company profile' })
  return items
}

export function ArmoryShell({ ctx, nav, children, banner }: ArmoryShellProps) {
  const statusBanner =
    banner ?? (ctx.dealerAccount ? buildBanner(ctx, ctx.dealerAccount) : null)

  return (
    <PageLayout>
      <BackButton href="/profile" label="Back to profile" />
      <PageHeader
        title="Armory"
        description={
          ctx.dealerAccount
            ? `${ctx.dealerAccount.companyName} · ${ctx.staffRole === 'owner' ? 'Owner' : 'Staff'} · Licence ${ctx.dealerAccount.dealerLicenceNumber ?? '—'}`
            : 'Manage your personal firearm collection'
        }
      />

      {!ctx.dealerAccount && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Running a dealership? Register for the full Armory dashboard.
          </p>
          <Button asChild size="sm">
            <Link href="/profile/armory/register">Register as Dealership</Link>
          </Button>
        </div>
      )}

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground',
              'hover:border-muted-foreground/30'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {statusBanner && <div className="mb-6">{statusBanner}</div>}

      <div className="space-y-6">{children}</div>
    </PageLayout>
  )
}
