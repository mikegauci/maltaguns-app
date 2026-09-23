'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ItemRow, BuyerRow } from '@/lib/armory/types'
import {
  bulkSetItemType,
  bulkDeleteItems,
  bulkSetCip,
  findNonFirearmItems,
  quickEditItem,
  assignBuyer,
  markPendingTransferManual,
  markTransferred,
  cancelPendingTransfer,
  setOnHold,
  clearOnHold,
  deleteItem,
  type NonFirearmFlag,
} from '@/lib/armory/actions/items'
import { StatusBadge } from '@/components/armory/status-badge'
import { ITEM_STATUS_LABEL, ITEM_STATUS_TONE } from '@/lib/armory/status-tones'
import { eur } from '@/lib/armory/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const BASE = '/profile/armory'

type ItemType = 'FIREARM' | 'REGULATED_COMPONENT' | 'ACCESSORY'
const TYPE_LABEL: Record<string, string> = {
  FIREARM: 'Firearm',
  REGULATED_COMPONENT: 'Component',
  ACCESSORY: 'Accessory',
}

const stickyTh = 'sticky top-0 z-20 bg-background border-b border-border'

type SortKey = ColumnKey | 'makeModel' | 'serial'

function sortValue(i: ItemRow, key: SortKey): string | number {
  switch (key) {
    case 'makeModel':
      return `${i.make ?? ''} ${i.model ?? ''}`.trim().toLowerCase()
    case 'serial':
      return (i.serialNumber ?? '').toLowerCase()
    case 'type':
      return TYPE_LABEL[i.itemType] ?? ''
    case 'calibre':
      return (i.calibreDisplay ?? i.calibreRaw ?? '').toLowerCase()
    case 'schedule':
      return (i.scheduleProforma ?? '').toLowerCase()
    case 'cip':
      return i.cipProof === true ? 1 : i.cipProof === false ? 0 : -1
    case 'country':
      return (i.countryOfManufacture ?? '').toLowerCase()
    case 'year':
      return i.yearOfManufacture ?? ''
    case 'loading':
      return (i.loading ?? '').toLowerCase()
    case 'barrel':
      return (i.barrelType ?? '').toLowerCase()
    case 'hammer':
      return (i.hammerType ?? '').toLowerCase()
    case 'sights':
      return (i.sightsType ?? '').toLowerCase()
    case 'buyer':
      return (i.buyerName ?? '').toLowerCase()
    case 'status':
      return displayStatus(i).label
    case 'shipment':
      return (i.shipmentReference ?? '').toLowerCase()
    case 'cost':
      return (i.acquisitionPrice ?? 0) + (i.egunDomesticShippingFee ?? 0)
    case 'sale':
      return i.currentHolderType === 'BUYER'
        ? (i.salePrice ?? 0) + (i.clientHandlingFee ?? 0)
        : -1
    case 'paid':
      return i.currentHolderType === 'BUYER' ? (i.paymentStatus ?? '') : ''
    default:
      return ''
  }
}

function SortTh({
  label,
  sortKeyName,
  sort,
  onSort,
}: {
  label: string
  sortKeyName: SortKey
  sort: { key: SortKey | null; dir: 'asc' | 'desc' }
  onSort: (k: SortKey) => void
}) {
  const active = sort.key === sortKeyName
  return (
    <TableHead
      className={cn(
        stickyTh,
        'cursor-pointer select-none hover:text-foreground'
      )}
      onClick={() => onSort(sortKeyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={cn('text-[9px]', !active && 'opacity-30')}>
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲'}
        </span>
      </span>
    </TableHead>
  )
}

type ColumnKey =
  | 'type'
  | 'calibre'
  | 'schedule'
  | 'cip'
  | 'country'
  | 'year'
  | 'loading'
  | 'barrel'
  | 'hammer'
  | 'sights'
  | 'buyer'
  | 'status'
  | 'shipment'
  | 'cost'
  | 'sale'
  | 'paid'

const COLUMN_DEFS: { key: ColumnKey; label: string; default: boolean }[] = [
  { key: 'type', label: 'Type', default: true },
  { key: 'calibre', label: 'Calibre', default: true },
  { key: 'schedule', label: 'Schedule', default: true },
  { key: 'cip', label: 'CIP', default: true },
  { key: 'buyer', label: 'Buyer', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'country', label: 'Country', default: false },
  { key: 'year', label: 'Year', default: false },
  { key: 'loading', label: 'Loading', default: false },
  { key: 'barrel', label: 'Barrel', default: false },
  { key: 'hammer', label: 'Hammer', default: false },
  { key: 'sights', label: 'Sights', default: false },
  { key: 'shipment', label: 'Shipment', default: true },
  { key: 'cost', label: 'Cost', default: true },
  { key: 'sale', label: 'Sale + fee', default: true },
  { key: 'paid', label: 'Paid', default: true },
]

const COLUMNS_STORAGE_KEY = 'maltaguns:itemsTableColumns:v1'

function displayStatus(i: ItemRow) {
  if (i.status === 'PENDING_TRANSFER')
    return {
      label: 'Pending transfer',
      value: 'PENDING_TRANSFER',
      tone: ITEM_STATUS_TONE.PENDING_TRANSFER,
    }
  if (i.status === 'TRANSFERRED')
    return {
      label: 'Sold',
      value: 'TRANSFERRED',
      tone: ITEM_STATUS_TONE.TRANSFERRED,
    }
  if (i.status === 'REJECTED')
    return {
      label: ITEM_STATUS_LABEL.REJECTED,
      value: 'REJECTED',
      tone: ITEM_STATUS_TONE.REJECTED,
    }
  if (!i.shipmentArrivedAt)
    return {
      label: 'Awaiting delivery',
      value: 'AWAITING',
      tone: 'neutral' as const,
    }
  return {
    label: 'In stock',
    value: 'AWAITING',
    tone: ITEM_STATUS_TONE.AVAILABLE,
  }
}

function EditableText({
  id,
  field,
  value,
  mono,
  placeholder,
  locked,
}: {
  id: string
  field: string
  value: string | null
  mono?: boolean
  placeholder?: string
  locked?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [pending, start] = useTransition()
  const router = useRouter()

  if (locked)
    return (
      <span className={mono ? 'font-mono text-xs' : 'text-sm'}>
        {value ?? <span className="text-muted-foreground">—</span>}
      </span>
    )

  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          'w-full text-left rounded px-1 -mx-1 hover:bg-muted',
          mono ? 'font-mono text-xs' : 'text-sm'
        )}
        onClick={() => {
          setDraft(value ?? '')
          setEditing(true)
        }}
        title="Click to edit"
      >
        {value ?? (
          <span className="text-destructive">{placeholder ?? 'missing'}</span>
        )}
      </button>
    )
  }

  function save() {
    setEditing(false)
    if (draft === (value ?? '')) return
    start(async () => {
      const r = await quickEditItem(id, field, draft)
      if (!r.ok) alert(r.error)
      router.refresh()
    })
  }

  return (
    <input
      autoFocus
      disabled={pending}
      className={cn(
        'w-full rounded border border-input bg-background px-1 py-0.5',
        mono ? 'font-mono text-xs' : 'text-sm'
      )}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

export function ItemsTable({
  items,
  showShipment,
  showEconomics,
  buyers = [],
  firearmsOnly,
}: {
  items: ItemRow[]
  showShipment?: boolean
  showEconomics?: boolean
  buyers?: BuyerRow[]
  firearmsOnly?: boolean
}) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [hideSold, setHideSold] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sort, setSort] = useState<{
    key: SortKey | null
    dir: 'asc' | 'desc'
  }>({ key: null, dir: 'asc' })
  const [flagged, setFlagged] = useState<NonFirearmFlag[] | null>(null)
  const [flagSel, setFlagSel] = useState<Set<string>>(new Set())
  const router = useRouter()

  function onSort(key: SortKey) {
    setSort(s => {
      if (s.key !== key) return { key, dir: 'asc' }
      if (s.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: 'asc' }
    })
  }

  const availableColumns = useMemo(
    () =>
      COLUMN_DEFS.filter(c =>
        c.key === 'shipment'
          ? showShipment
          : c.key === 'cost' || c.key === 'sale' || c.key === 'paid'
            ? showEconomics
            : true
      ),
    [showShipment, showEconomics]
  )

  const [visible, setVisible] = useState<Set<ColumnKey>>(
    () => new Set(COLUMN_DEFS.filter(c => c.default).map(c => c.key))
  )
  const [columnsHydrated, setColumnsHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY)
      if (raw) setVisible(new Set(JSON.parse(raw) as ColumnKey[]))
    } catch {
      /* ignore */
    }
    setColumnsHydrated(true)
  }, [])

  useEffect(() => {
    if (!columnsHydrated) return
    try {
      window.localStorage.setItem(
        COLUMNS_STORAGE_KEY,
        JSON.stringify(Array.from(visible))
      )
    } catch {
      /* ignore */
    }
  }, [visible, columnsHydrated])

  function toggleColumn(key: ColumnKey) {
    setVisible(v => {
      const n = new Set(v)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  const col = (key: ColumnKey) =>
    visible.has(key) && availableColumns.some(c => c.key === key)

  const soldCount = useMemo(
    () => items.filter(i => i.status === 'TRANSFERRED').length,
    [items]
  )

  const filtered = useMemo(() => {
    let list = items
    if (hideSold) list = list.filter(i => i.status !== 'TRANSFERRED')
    const needle = q.trim().toLowerCase()
    if (needle) {
      list = list.filter(i =>
        [
          i.make,
          i.model,
          i.serialNumber,
          i.calibreDisplay,
          i.calibreRaw,
          i.buyerName,
          i.shipmentReference,
        ]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(needle))
      )
    }
    return list
  }, [items, q, hideSold])

  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    const key = sort.key
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, key)
      const vb = sortValue(b, key)
      if (typeof va === 'number' && typeof vb === 'number')
        return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [filtered, sort])

  const selected = useMemo(
    () => filtered.filter(i => sel.has(i.id)),
    [filtered, sel]
  )
  const selectedFirearmsWithBuyer = selected.filter(
    i => i.itemType === 'FIREARM' && i.currentHolderBuyerId
  )

  const byBuyer = useMemo(() => {
    const m = new Map<string, { name: string; ids: string[] }>()
    for (const i of filtered) {
      if (
        i.itemType !== 'FIREARM' ||
        !i.currentHolderBuyerId ||
        i.status === 'TRANSFERRED'
      )
        continue
      const e = m.get(i.currentHolderBuyerId) ?? {
        name: i.buyerName ?? 'Buyer',
        ids: [],
      }
      e.ids.push(i.id)
      m.set(i.currentHolderBuyerId, e)
    }
    return Array.from(m.entries())
  }, [filtered])

  function toggleAll() {
    setSel(
      sel.size === filtered.length
        ? new Set()
        : new Set(filtered.map(i => i.id))
    )
  }

  function toggleSel(id: string) {
    setSel(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function bulkDelete() {
    if (
      !window.confirm(
        `Delete ${sel.size} selected item(s)? They'll disappear from inventory immediately, but are kept in the Bin for 30 days in case this was a mistake.`
      )
    )
      return
    start(async () => {
      const r = await bulkDeleteItems(Array.from(sel))
      setMsg(r.ok ? (r.message ?? 'Done') : r.error)
      setSel(new Set())
      router.refresh()
    })
  }

  function bulkType(itemType: ItemType) {
    if (
      !window.confirm(
        `Change ${sel.size} selected item(s) to ${TYPE_LABEL[itemType]}?`
      )
    )
      return
    start(async () => {
      const r = await bulkSetItemType(Array.from(sel), itemType)
      setMsg(r.ok ? (r.message ?? 'Done') : r.error)
      router.refresh()
    })
  }

  function bulkCip(value: 0 | 1) {
    if (
      !window.confirm(
        `Set CIP proof to ${value ? 'yes' : 'no'} on ${sel.size} selected item(s)?`
      )
    )
      return
    start(async () => {
      const r = await bulkSetCip(Array.from(sel), value)
      setMsg(r.ok ? (r.message ?? 'Done') : r.error)
      router.refresh()
    })
  }

  function scanForNonFirearms() {
    const ids = filtered.filter(i => i.itemType === 'FIREARM').map(i => i.id)
    setMsg(null)
    start(async () => {
      const r = await findNonFirearmItems(ids)
      if (!r.ok) {
        alert(r.error)
        return
      }
      setFlagged(r.flagged ?? [])
      setFlagSel(new Set((r.flagged ?? []).map(f => f.id)))
      if (!r.flagged?.length)
        setMsg(r.message ?? 'No likely misclassified items found')
    })
  }

  function moveFlagged() {
    if (!flagged) return
    const toMove = flagged.filter(f => flagSel.has(f.id))
    if (!toMove.length) return
    start(async () => {
      const byType = new Map<ItemType, string[]>()
      for (const f of toMove)
        byType.set(f.suggested, [...(byType.get(f.suggested) ?? []), f.id])
      let total = 0
      for (const [t, ids] of Array.from(byType.entries())) {
        const r = await bulkSetItemType(ids, t)
        if (r.ok) total += ids.length
        else alert(r.error)
      }
      setMsg(`Moved ${total} item(s) to non-firearms`)
      setFlagged(null)
      router.refresh()
    })
  }

  function changeBuyer(itemId: string, buyerId: string) {
    start(async () => {
      const r = await assignBuyer(itemId, buyerId || null)
      if (!r.ok) alert(r.error)
      router.refresh()
    })
  }

  function changeStatus(item: ItemRow, value: string) {
    start(async () => {
      let r
      if (value === 'AWAITING')
        r =
          item.status === 'PENDING_TRANSFER'
            ? await cancelPendingTransfer(item.id)
            : await assignBuyer(item.id, null)
      else if (value === 'PENDING_TRANSFER')
        r = await markPendingTransferManual(item.id)
      else if (value === 'TRANSFERRED') r = await markTransferred(item.id)
      else return
      if (r && !r.ok) alert(r.error)
      router.refresh()
    })
  }

  function holdItem(item: ItemRow) {
    const reason = window.prompt(
      'Reason for putting this item on hold (visible to your team):',
      item.onHoldReason ?? ''
    )
    if (reason === null) return
    if (!reason.trim()) {
      alert('Add a short reason for the hold')
      return
    }
    start(async () => {
      const r = await setOnHold(item.id, reason)
      if (!r.ok) alert(r.error)
      router.refresh()
    })
  }

  function releaseHold(itemId: string) {
    start(async () => {
      const r = await clearOnHold(itemId)
      if (!r.ok) alert(r.error)
      router.refresh()
    })
  }

  function removeItem(itemId: string) {
    if (
      !window.confirm(
        'Delete this item? It will disappear from inventory immediately but is kept in the Bin for 30 days.'
      )
    )
      return
    start(async () => {
      const r = await deleteItem(itemId)
      if (!r.ok) alert(r.error)
      router.refresh()
    })
  }

  if (items.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
        No items.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter make, model, serial, buyer…"
          className="h-8 w-56 text-xs"
        />
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={hideSold}
            onChange={e => setHideSold(e.target.checked)}
          />{' '}
          Hide sold
        </label>
        <span className="text-muted-foreground">
          {items.length - soldCount} available · {soldCount} sold
        </span>
        <span className="text-muted-foreground">{sel.size} selected</span>
        <button
          type="button"
          className="text-destructive hover:underline disabled:opacity-50"
          disabled={!sel.size || pending}
          onClick={bulkDelete}
        >
          Delete selected
        </button>
        <span className="text-muted-foreground">|</span>
        <label className="inline-flex items-center gap-1">
          Change type to:
          <select
            className="h-8 rounded-md border border-input bg-background px-1 text-xs"
            disabled={!sel.size || pending}
            defaultValue=""
            onChange={e => {
              const v = e.target.value
              e.target.value = ''
              if (v) bulkType(v as ItemType)
            }}
          >
            <option value="" disabled>
              choose…
            </option>
            <option value="FIREARM">Firearm</option>
            <option value="REGULATED_COMPONENT">Regulated component</option>
            <option value="ACCESSORY">Accessory</option>
          </select>
        </label>
        <span className="text-muted-foreground">|</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={!sel.size || pending}
          onClick={() => bulkCip(1)}
        >
          CIP yes
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={!sel.size || pending}
          onClick={() => bulkCip(0)}
        >
          CIP no
        </Button>
        {firearmsOnly && (
          <>
            <span className="text-muted-foreground">|</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={pending}
              onClick={scanForNonFirearms}
            >
              Find non-firearms
            </Button>
          </>
        )}
        {selectedFirearmsWithBuyer.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() =>
              setPreviewUrl(
                `${BASE}/print/proforma?items=${selectedFirearmsWithBuyer.map(i => i.id).join(',')}`
              )
            }
          >
            Transfer {selectedFirearmsWithBuyer.length} item
            {selectedFirearmsWithBuyer.length > 1 ? 's' : ''}
          </Button>
        )}
        {byBuyer.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-1">
            <span className="text-muted-foreground ml-2">
              Transfer all for:
            </span>
            {byBuyer.map(([id, b]) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  setPreviewUrl(
                    `${BASE}/print/proforma?items=${b.ids.join(',')}`
                  )
                }
              >
                {b.name} ({b.ids.length})
              </Button>
            ))}
          </span>
        )}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Columns ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableColumns.map(c => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={visible.has(c.key)}
                  onCheckedChange={() => toggleColumn(c.key)}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {msg && <span className="text-emerald-600">{msg}</span>}
      </div>

      {flagged && flagged.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-amber-900 dark:text-amber-200">
              {flagged.length} item{flagged.length > 1 ? 's' : ''} look
              {flagged.length > 1 ? '' : 's'} like they might not be firearms
            </span>
            <button
              type="button"
              className="text-xs underline text-muted-foreground"
              onClick={() => setFlagged(null)}
            >
              Dismiss
            </button>
          </div>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {flagged.map(f => {
              const item = items.find(i => i.id === f.id)
              if (!item) return null
              return (
                <li key={f.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={flagSel.has(f.id)}
                    onChange={e => {
                      const n = new Set(flagSel)
                      if (e.target.checked) n.add(f.id)
                      else n.delete(f.id)
                      setFlagSel(n)
                    }}
                  />
                  <span>
                    {item.make} {item.model}
                    {item.serialNumber && (
                      <span className="text-muted-foreground font-mono text-xs ml-1">
                        {item.serialNumber}
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    → {TYPE_LABEL[f.suggested]}
                  </span>
                  {f.confidence === 'low' && (
                    <StatusBadge tone="amber">low confidence</StatusBadge>
                  )}
                </li>
              )
            })}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={!flagSel.size || pending}
            onClick={moveFlagged}
          >
            Move {flagSel.size} to non-firearms
          </Button>
        </div>
      )}

      <div className="max-h-[65vh] overflow-auto rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className={cn(stickyTh, 'cursor-pointer w-10')}
                onClick={toggleAll}
              >
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && sel.size === filtered.length}
                  onChange={toggleAll}
                  onClick={e => e.stopPropagation()}
                />
              </TableHead>
              {col('type') && (
                <SortTh
                  label="Type"
                  sortKeyName="type"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              <SortTh
                label="Make / model"
                sortKeyName="makeModel"
                sort={sort}
                onSort={onSort}
              />
              <SortTh
                label="Serial"
                sortKeyName="serial"
                sort={sort}
                onSort={onSort}
              />
              {col('calibre') && (
                <SortTh
                  label="Calibre"
                  sortKeyName="calibre"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('schedule') && (
                <SortTh
                  label="Schedule"
                  sortKeyName="schedule"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('cip') && (
                <SortTh
                  label="CIP"
                  sortKeyName="cip"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('country') && (
                <SortTh
                  label="Country"
                  sortKeyName="country"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('year') && (
                <SortTh
                  label="Year"
                  sortKeyName="year"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('loading') && (
                <SortTh
                  label="Loading"
                  sortKeyName="loading"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('barrel') && (
                <SortTh
                  label="Barrel"
                  sortKeyName="barrel"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('hammer') && (
                <SortTh
                  label="Hammer"
                  sortKeyName="hammer"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('sights') && (
                <SortTh
                  label="Sights"
                  sortKeyName="sights"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('buyer') && (
                <SortTh
                  label="Buyer"
                  sortKeyName="buyer"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('status') && (
                <SortTh
                  label="Status"
                  sortKeyName="status"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('shipment') && (
                <SortTh
                  label="Shipment"
                  sortKeyName="shipment"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('cost') && (
                <SortTh
                  label="Cost"
                  sortKeyName="cost"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('sale') && (
                <SortTh
                  label="Sale + fee"
                  sortKeyName="sale"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              {col('paid') && (
                <SortTh
                  label="Paid"
                  sortKeyName="paid"
                  sort={sort}
                  onSort={onSort}
                />
              )}
              <TableHead
                className={cn(
                  stickyTh,
                  'sticky right-0 z-30 bg-background border-l'
                )}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(i => {
              const locked = i.status === 'TRANSFERRED'
              const ds = displayStatus(i)
              return (
                <TableRow
                  key={i.id}
                  className={cn(
                    sel.has(i.id) && 'bg-muted/50',
                    locked && 'opacity-50'
                  )}
                >
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => toggleSel(i.id)}
                  >
                    <input
                      type="checkbox"
                      checked={sel.has(i.id)}
                      onChange={() => toggleSel(i.id)}
                      onClick={e => e.stopPropagation()}
                    />
                  </TableCell>
                  {col('type') && (
                    <TableCell>
                      <div className="text-sm">{TYPE_LABEL[i.itemType]}</div>
                      {i.itemType === 'FIREARM' && i.category && (
                        <div className="text-sm text-muted-foreground">
                          {i.category.replace(/_/g, ' ').toLowerCase()}
                        </div>
                      )}
                      {i.itemType !== 'FIREARM' && i.typeDescription && (
                        <div className="text-sm text-muted-foreground">
                          {i.typeDescription}
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <EditableText
                          id={i.id}
                          field="make"
                          value={i.make}
                          locked={locked}
                          placeholder="make"
                        />
                        <EditableText
                          id={i.id}
                          field="model"
                          value={i.model}
                          locked={locked}
                          placeholder="model"
                        />
                      </div>
                      {i.quantity > 1 && (
                        <span className="text-muted-foreground text-sm">
                          ×{i.quantity}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`${BASE}/inventory/${i.id}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Details
                    </Link>
                  </TableCell>
                  <TableCell>
                    <EditableText
                      id={i.id}
                      field="serialNumber"
                      value={i.serialNumber}
                      mono
                      locked={locked}
                    />
                  </TableCell>
                  {col('calibre') && (
                    <TableCell>
                      <EditableText
                        id={i.id}
                        field="calibreRaw"
                        value={i.calibreDisplay ?? i.calibreRaw}
                        locked={locked}
                      />
                    </TableCell>
                  )}
                  {col('schedule') && (
                    <TableCell className="text-sm">
                      {i.scheduleProforma ?? '—'}
                      {i.scheduleOverridden && (
                        <StatusBadge tone="amber" className="ml-1">
                          override
                        </StatusBadge>
                      )}
                    </TableCell>
                  )}
                  {col('cip') && (
                    <TableCell>
                      {locked ? (
                        i.cipProof === true ? (
                          'Yes'
                        ) : i.cipProof === false ? (
                          'No'
                        ) : (
                          <span className="text-muted-foreground">?</span>
                        )
                      ) : (
                        <select
                          className="h-8 rounded-md border border-input bg-background px-1 text-sm"
                          value={
                            i.cipProof === true
                              ? '1'
                              : i.cipProof === false
                                ? '0'
                                : ''
                          }
                          onChange={e => {
                            start(async () => {
                              const r = await quickEditItem(
                                i.id,
                                'cipProof',
                                e.target.value
                              )
                              if (!r.ok) alert(r.error)
                              router.refresh()
                            })
                          }}
                        >
                          <option value="">?</option>
                          <option value="1">Yes</option>
                          <option value="0">No</option>
                        </select>
                      )}
                    </TableCell>
                  )}
                  {col('country') && (
                    <TableCell className="text-sm">
                      {i.countryOfManufacture ?? '—'}
                    </TableCell>
                  )}
                  {col('year') && (
                    <TableCell className="text-sm">
                      {i.yearOfManufacture ?? '—'}
                    </TableCell>
                  )}
                  {col('loading') && (
                    <TableCell className="text-sm">
                      {i.loading
                        ? i.loading.replace(/_/g, ' ').toLowerCase()
                        : '—'}
                    </TableCell>
                  )}
                  {col('barrel') && (
                    <TableCell className="text-sm">
                      {i.barrelType ?? '—'}
                    </TableCell>
                  )}
                  {col('hammer') && (
                    <TableCell className="text-sm">
                      {i.hammerType ?? '—'}
                    </TableCell>
                  )}
                  {col('sights') && (
                    <TableCell className="text-sm">
                      {i.sightsType ?? '—'}
                    </TableCell>
                  )}
                  {col('buyer') && (
                    <TableCell>
                      {locked || !buyers.length ? (
                        (i.buyerName ?? (
                          <span className="text-muted-foreground">stock</span>
                        ))
                      ) : (
                        <select
                          className="h-8 w-36 rounded-md border border-input bg-background px-1 text-sm"
                          value={i.currentHolderBuyerId ?? ''}
                          onChange={e => changeBuyer(i.id, e.target.value)}
                        >
                          <option value="">stock</option>
                          {buyers.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.firstNames} {b.surname}
                              {b.nickname ? ` "${b.nickname}"` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </TableCell>
                  )}
                  {col('status') && (
                    <TableCell>
                      {locked || i.status === 'REJECTED' ? (
                        <StatusBadge tone={ds.tone}>{ds.label}</StatusBadge>
                      ) : i.onHold ? (
                        <div className="space-y-1">
                          <span title={i.onHoldReason ?? undefined}>
                            <StatusBadge tone="amber">On hold</StatusBadge>
                          </span>
                          {i.onHoldReason && (
                            <div
                              className="text-xs text-muted-foreground max-w-40 truncate"
                              title={i.onHoldReason}
                            >
                              {i.onHoldReason}
                            </div>
                          )}
                          <button
                            type="button"
                            className="block text-xs underline text-muted-foreground"
                            onClick={() => releaseHold(i.id)}
                          >
                            Release hold
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <select
                            className="h-8 rounded-md border border-input bg-background px-1 text-sm"
                            value={ds.value}
                            onChange={e => changeStatus(i, e.target.value)}
                          >
                            <option value="AWAITING">
                              {i.shipmentArrivedAt
                                ? 'In stock'
                                : 'Awaiting delivery'}
                            </option>
                            {i.itemType === 'FIREARM' && (
                              <option value="PENDING_TRANSFER">
                                Pending transfer
                              </option>
                            )}
                            <option value="TRANSFERRED">Sold</option>
                          </select>
                          <button
                            type="button"
                            className="block text-xs underline text-muted-foreground"
                            onClick={() => holdItem(i)}
                          >
                            Put on hold
                          </button>
                        </div>
                      )}
                      {i.status === 'TRANSFERRED' &&
                        !i.commissionerNotifiedAt && (
                          <StatusBadge tone="red" className="ml-1">
                            notify police
                          </StatusBadge>
                        )}
                    </TableCell>
                  )}
                  {col('shipment') && (
                    <TableCell>
                      {i.shipmentId ? (
                        <Link
                          href={`${BASE}/shipments/${i.shipmentId}`}
                          className="hover:underline"
                        >
                          {i.shipmentReference}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  )}
                  {col('cost') && (
                    <TableCell className="tabular-nums">
                      {eur(
                        (i.acquisitionPrice ?? 0) +
                          (i.egunDomesticShippingFee ?? 0)
                      )}
                    </TableCell>
                  )}
                  {col('sale') && (
                    <TableCell className="tabular-nums">
                      {i.currentHolderType === 'BUYER'
                        ? eur((i.salePrice ?? 0) + (i.clientHandlingFee ?? 0))
                        : '—'}
                    </TableCell>
                  )}
                  {col('paid') && (
                    <TableCell>
                      {i.currentHolderType === 'BUYER' ? (
                        <StatusBadge
                          tone={
                            i.paymentStatus === 'PAID'
                              ? 'green'
                              : i.paymentStatus === 'PARTIAL'
                                ? 'amber'
                                : 'red'
                          }
                        >
                          {i.paymentStatus}
                        </StatusBadge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  )}
                  <TableCell className="sticky right-0 z-10 bg-background border-l whitespace-nowrap space-x-2">
                    {i.itemType === 'FIREARM' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() =>
                          setPreviewUrl(
                            `${BASE}/print/proforma?items=${i.id}&edit=1`
                          )
                        }
                      >
                        Transfer
                      </Button>
                    )}
                    {!locked && (
                      <button
                        type="button"
                        className="text-xs text-destructive hover:underline"
                        onClick={() => removeItem(i.id)}
                      >
                        Delete
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {previewUrl && (
        <TransferPreviewModal
          url={previewUrl}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  )
}

function TransferPreviewModal({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <span className="text-sm font-medium">Transfer document preview</span>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              className="text-xs text-muted-foreground hover:underline"
            >
              Open in new tab
            </a>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <iframe
          src={url}
          title="Transfer document preview"
          className="flex-1 w-full bg-muted"
        />
      </div>
    </div>
  )
}
