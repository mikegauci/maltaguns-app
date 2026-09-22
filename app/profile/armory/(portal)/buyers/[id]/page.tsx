import { notFound } from 'next/navigation'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { BackLink } from '@/components/armory/back-link'
import { SectionCard } from '@/components/armory/section-card'
import { BuyerForm } from '@/components/armory/buyer-form'
import { ItemsTable } from '@/components/armory/items-table'
import { ActionButton } from '@/components/armory/action-form'
import { requireDealerAccount } from '@/lib/armory/auth'
import { getBuyer, listBuyers, listBuyerItems } from '@/lib/armory/queries'
import { updateBuyer, anonymiseBuyer } from '@/lib/armory/actions/buyers'
import { Button } from '@/components/ui/button'

const BASE = '/profile/armory'

export default async function BuyerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requireDealerAccount()
  const buyer = await getBuyer(ctx.dealerAccount.id, id)
  if (!buyer) notFound()
  const approved = ctx.isApproved
  const items = await listBuyerItems(ctx.dealerAccount.id, id)
  const printable = items.filter(
    i => i.itemType === 'FIREARM' && i.status !== 'TRANSFERRED'
  )
  const buyers = (await listBuyers(ctx.dealerAccount.id)).filter(
    b => !b.anonymisedAt
  )

  return (
    <ProfilePageLayout
      title={`${buyer.firstNames} ${buyer.surname}${buyer.nickname ? ` "${buyer.nickname}"` : ''}`}
      description="Buyer details and assigned items"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BackLink href={`${BASE}/buyers`}>All buyers</BackLink>
        {printable.length > 0 && (
          <Button asChild size="sm">
            <a
              href={`${BASE}/print/proforma?items=${printable.map(i => i.id).join(',')}`}
              target="_blank"
            >
              Print all {printable.length} transfer proforma
              {printable.length > 1 ? 's' : ''}
            </a>
          </Button>
        )}
      </div>

      <SectionCard title={`Items (${items.length})`}>
        <ItemsTable items={items} showShipment showEconomics buyers={buyers} />
      </SectionCard>

      <SectionCard title="Details">
        {buyer.anonymisedAt ? (
          <p className="text-sm text-muted-foreground">
            This record was anonymised. Ownership history is retained without
            personal data.
          </p>
        ) : approved ? (
          <BuyerForm
            action={updateBuyer.bind(null, id)}
            buyer={buyer}
            submitLabel="Save buyer"
          />
        ) : null}
      </SectionCard>

      {approved && !buyer.anonymisedAt && ctx.staffRole === 'owner' && (
        <SectionCard
          title="Data protection"
          description="GDPR right to erasure while keeping Arms Act records."
        >
          <ActionButton
            variant="danger"
            action={anonymiseBuyer.bind(null, id)}
            confirm="Anonymise this buyer? Personal data is removed permanently; ownership history stays."
          >
            Anonymise buyer
          </ActionButton>
        </SectionCard>
      )}
    </ProfilePageLayout>
  )
}
