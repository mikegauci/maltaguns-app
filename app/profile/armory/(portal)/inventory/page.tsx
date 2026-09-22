import Link from 'next/link'
import { Suspense } from 'react'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { NativeSelect } from '@/components/armory/native-select'
import { requireArmoryContext, requireDealerAccount } from '@/lib/armory/auth'
import { listAllItems, listBuyers } from '@/lib/armory/queries'
import { createDirectItem } from '@/lib/armory/actions/items'
import { ItemsTable } from '@/components/armory/items-table'
import { ItemForm } from '@/components/armory/item-form'
import { PersonalInventoryPanel } from '@/components/armory/PersonalInventoryPanel'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const BASE = '/profile/armory'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; itemType?: string }>
}) {
  const sp = await searchParams
  const ctx = await requireArmoryContext()

  if (!ctx.dealerAccount) {
    const supabase = await createClient()
    const { data: personal } = await supabase
      .from('armory_personal_items')
      .select('*')
      .eq('profile_id', ctx.userId)
      .order('created_at', { ascending: false })
    return (
      <ProfilePageLayout
        title="Inventory"
        description="Manage your personal firearm collection"
      >
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Loading inventory…</p>
          }
        >
          <PersonalInventoryPanel initialItems={personal ?? []} />
        </Suspense>
      </ProfilePageLayout>
    )
  }

  const dealerCtx = await requireDealerAccount()
  const account = dealerCtx.dealerAccount
  const approved = dealerCtx.isApproved
  const filter = { q: sp.q, status: sp.status, itemType: sp.itemType }
  const items = await listAllItems(account.id, filter)
  const buyers = (await listBuyers(account.id)).filter(b => !b.anonymisedAt)

  const [allCount, firearmCount, nonFirearmCount] = await Promise.all([
    listAllItems(account.id, { q: sp.q, status: sp.status }).then(
      r => r.length
    ),
    listAllItems(account.id, {
      q: sp.q,
      status: sp.status,
      itemType: 'FIREARM',
    }).then(r => r.length),
    listAllItems(account.id, {
      q: sp.q,
      status: sp.status,
      itemType: 'NON_FIREARM',
    }).then(r => r.length),
  ])

  const activeTab =
    sp.itemType === 'FIREARM'
      ? 'FIREARM'
      : sp.itemType === 'NON_FIREARM'
        ? 'NON_FIREARM'
        : ''

  function tabHref(itemType: string) {
    const params = new URLSearchParams()
    if (sp.q) params.set('q', sp.q)
    if (sp.status) params.set('status', sp.status)
    if (itemType) params.set('itemType', itemType)
    const qs = params.toString()
    return `${BASE}/inventory${qs ? `?${qs}` : ''}`
  }

  const tabs = [
    { key: '', label: `All (${allCount})` },
    { key: 'FIREARM', label: `Firearms (${firearmCount})` },
    { key: 'NON_FIREARM', label: `Non-firearms (${nonFirearmCount})` },
  ]

  return (
    <ProfilePageLayout
      title="Inventory"
      description="Dealer stock across all shipments."
    >
      {approved && (
        <SectionCard
          title="Add item"
          description="Bought locally rather than imported? Add it straight to inventory."
        >
          <details className="group">
            <summary className="cursor-pointer select-none text-sm font-medium">
              + Add item to inventory
            </summary>
            <div className="mt-3 rounded border border-dashed p-4">
              <ItemForm
                action={createDirectItem}
                submitLabel="Add to inventory"
                compact
              />
            </div>
          </details>
        </SectionCard>
      )}

      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              activeTab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <SectionCard
        title={`Inventory (${items.length})`}
        actions={
          <form className="flex flex-wrap gap-2" method="get">
            <Input
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="Search make, model, serial…"
              className="w-56"
            />
            <NativeSelect
              name="status"
              defaultValue={sp.status ?? ''}
              className="w-44"
            >
              <option value="">All statuses</option>
              <option value="AVAILABLE">In stock</option>
              <option value="RESERVED">Reserved</option>
              <option value="PENDING_TRANSFER">Pending transfer</option>
              <option value="TRANSFERRED">Transferred</option>
            </NativeSelect>
            <Button type="submit" variant="outline" size="sm">
              Filter
            </Button>
          </form>
        }
      >
        <ItemsTable
          items={items}
          showShipment
          showEconomics
          buyers={buyers}
          firearmsOnly={activeTab === 'FIREARM'}
        />
      </SectionCard>
    </ProfilePageLayout>
  )
}
