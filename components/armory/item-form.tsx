'use client'
import { useMemo, useState } from 'react'
import { ActionForm, type ActionResult } from './action-form'
import { Field, Input, Select, Textarea, Warn, Badge } from './ui'
import {
  classify,
  FIREARM_CATEGORIES,
  LOADING_OPTIONS,
  FIRE_MODES,
  SIGHT_OPTIONS,
  SIGHT_LABELS,
  REGULATED_COMPONENT_TYPES,
  ACCESSORY_TYPES,
  PROFORMA_LOADING_OPTIONS,
  PROFORMA_BARREL_HAMMER_OPTIONS,
  SCHEDULE_LINE_ITEMS,
  PURCHASE_PURPOSE_OPTIONS,
  suggestScheduleLineItem,
  type ItemType,
} from '@/lib/armory/classification'
import type { ItemRow } from '@/lib/armory/types'

type Props = {
  action: (fd: FormData) => Promise<ActionResult | void>
  item?: ItemRow | null
  submitLabel?: string
  compact?: boolean
  onDone?: (r: ActionResult) => void
}

function Req({ children }: { children: string }) {
  return (
    <>
      {children} <span className="text-red-500">*</span>
    </>
  )
}

export function ItemForm({
  action,
  item,
  submitLabel = 'Save item',
  compact,
  onDone,
}: Props) {
  const [itemType, setItemType] = useState<ItemType>(
    item?.itemType ?? 'FIREARM'
  )
  const [category, setCategory] = useState(item?.category ?? 'RIFLE')
  const [fireMode, setFireMode] = useState(item?.fireMode ?? 'NOT_APPLICABLE')
  const [loading, setLoading] = useState(item?.loading ?? 'MANUAL')
  const [year, setYear] = useState(item?.yearOfManufacture ?? '')
  const [calibre, setCalibre] = useState(item?.calibreRaw ?? '')
  const [serial, setSerial] = useState(item?.serialNumber ?? '')
  const [noSerial, setNoSerial] = useState(
    (item?.serialNumber ?? '').trim().toUpperCase() === 'N/A'
  )
  const [make, setMake] = useState(item?.make ?? '')
  const [typeDescription, setTypeDescription] = useState(
    item?.typeDescription ?? ''
  )
  const [deactivated, setDeactivated] = useState(!!item?.deactivated)
  const sights = new Set((item?.sightsType ?? '').split(',').filter(Boolean))
  const proformaLoadingSet = new Set(
    (item?.proformaLoading ?? '').split(',').filter(Boolean)
  )
  const proformaBarrelHammerSet = new Set(
    (item?.proformaBarrelHammer ?? '').split(',').filter(Boolean)
  )
  const detailsDefaultOpen = !!item || !compact

  const preview = useMemo(
    () =>
      classify({
        itemType,
        category,
        fireMode,
        loading,
        yearOfManufacture: year,
        calibreRaw: calibre,
        serialNumber: serial,
        make,
        typeDescription,
        deactivated,
      }),
    [
      itemType,
      category,
      fireMode,
      loading,
      year,
      calibre,
      serial,
      make,
      typeDescription,
      deactivated,
    ]
  )
  const suggestedScheduleLineItem = useMemo(
    () => suggestScheduleLineItem(preview, category, deactivated),
    [preview, category, deactivated]
  )
  const [scheduleLineItemCode, setScheduleLineItemCode] = useState(
    item?.scheduleLineItemCode ?? ''
  )

  const isFirearm = itemType === 'FIREARM'
  const grid = compact
    ? 'grid grid-cols-2 md:grid-cols-4 gap-3'
    : 'grid grid-cols-2 md:grid-cols-3 gap-3'

  return (
    <ActionForm
      action={action}
      submitLabel={submitLabel}
      resetOnSuccess={!item}
      onDone={onDone}
    >
      <div className={grid}>
        <Field label="Item type">
          <Select
            name="itemType"
            value={itemType}
            onChange={e => setItemType(e.target.value as ItemType)}
          >
            <option value="FIREARM">Firearm</option>
            <option value="REGULATED_COMPONENT">
              Regulated component (barrel, receiver…)
            </option>
            <option value="ACCESSORY">
              Accessory (magazine, sling, tools…)
            </option>
          </Select>
        </Field>

        {isFirearm ? (
          <Field label="Firearm type">
            <Select
              name="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {FIREARM_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field
            label={
              itemType === 'REGULATED_COMPONENT' ? 'Component' : 'Accessory'
            }
          >
            <Input
              name="typeDescription"
              list="typeDescList"
              value={typeDescription}
              onChange={e => setTypeDescription(e.target.value)}
              placeholder="e.g. Magazine"
            />
            <datalist id="typeDescList">
              {(itemType === 'REGULATED_COMPONENT'
                ? REGULATED_COMPONENT_TYPES
                : ACCESSORY_TYPES
              ).map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
        )}

        <Field label={<Req>Make</Req>}>
          <Input
            name="make"
            value={make}
            onChange={e => setMake(e.target.value)}
            placeholder="e.g. Mauser"
            required
          />
        </Field>
        <Field label={<Req>Model</Req>}>
          <Input
            name="model"
            defaultValue={item?.model ?? ''}
            placeholder="e.g. K98k"
            required
          />
        </Field>
        <Field label="Serial number">
          <Input
            name="serialNumber"
            value={noSerial ? 'N/A' : serial}
            readOnly={noSerial}
            onChange={e => setSerial(e.target.value)}
            placeholder={isFirearm ? undefined : 'if any'}
          />
          <label className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={noSerial}
              onChange={e => {
                setNoSerial(e.target.checked)
                if (e.target.checked) setSerial('N/A')
              }}
            />{' '}
            No serial (mark N/A)
          </label>
        </Field>
        <Field
          label="Calibre (as written)"
          hint={
            preview.calibre.display && preview.calibre.display !== calibre
              ? `→ will print as "${preview.calibre.display}"`
              : undefined
          }
        >
          <Input
            name="calibreRaw"
            value={calibre}
            onChange={e => setCalibre(e.target.value)}
            placeholder="e.g. 12/70, 9x19, 7.62x39"
          />
        </Field>
        <Field label="Quantity">
          <Input
            name="quantity"
            type="number"
            min={1}
            defaultValue={item?.quantity ?? 1}
          />
        </Field>
      </div>

      <details open={detailsDefaultOpen} className="group">
        <summary className="cursor-pointer text-sm font-medium select-none text-neutral-600">
          {detailsDefaultOpen
            ? 'More details'
            : '+ Add more details (country, year, action, sights, pricing…)'}
        </summary>
        <div className={grid + ' mt-3'}>
          <Field label="Country of manufacture">
            <Input
              name="countryOfManufacture"
              defaultValue={item?.countryOfManufacture ?? ''}
              placeholder="e.g. Germany"
            />
          </Field>
          <Field label="Year of manufacture">
            <Input
              name="yearOfManufacture"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="e.g. 1943"
            />
          </Field>

          {isFirearm && (
            <>
              <Field label="Fire mode">
                <Select
                  name="fireMode"
                  value={fireMode}
                  onChange={e => setFireMode(e.target.value)}
                >
                  {FIRE_MODES.map(f => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Loading (feed)">
                <Select
                  name="loading"
                  value={loading}
                  onChange={e => setLoading(e.target.value)}
                >
                  {LOADING_OPTIONS.map(l => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Ammunition capacity"
                hint="Fills the Capacity box on the transfer proforma"
              >
                <Input
                  name="capacity"
                  type="number"
                  min={0}
                  defaultValue={item?.capacity ?? ''}
                />
              </Field>
              <Field label="Deactivated?">
                <label className="inline-flex items-center gap-2 text-sm pt-2">
                  <input
                    type="checkbox"
                    name="deactivated"
                    checked={deactivated}
                    onChange={e => setDeactivated(e.target.checked)}
                  />{' '}
                  Yes
                </label>
                {deactivated && (
                  <Input
                    name="deactivationCertRef"
                    defaultValue={item?.deactivationCertRef ?? ''}
                    placeholder="EU 2015/2403 certificate ref"
                    className="mt-1"
                  />
                )}
              </Field>
            </>
          )}

          {itemType !== 'ACCESSORY' && (
            <Field label="CIP proof mark">
              <Select
                name="cipProof"
                defaultValue={
                  item?.cipProof === true
                    ? '1'
                    : item?.cipProof === false
                      ? '0'
                      : ''
                }
              >
                <option value="">Unknown</option>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </Select>
            </Field>
          )}
          <Field label="Other features (annex)">
            <Input
              name="otherFeatures"
              defaultValue={item?.otherFeatures ?? ''}
              placeholder="e.g. matching numbers, import marks"
            />
          </Field>
        </div>

        <div className={grid + ' mt-3'}>
          <Field label="Original seller">
            <Input
              name="originalSeller"
              defaultValue={item?.originalSeller ?? ''}
              placeholder="eGun seller or dealer"
            />
          </Field>
          <Field label="eGun listing ID or URL">
            <Input
              name="egunListingId"
              defaultValue={item?.egunListingId ?? ''}
              placeholder="e.g. 20469880"
            />
          </Field>
          <Field label="Purchase price (€)">
            <Input
              name="acquisitionPrice"
              type="number"
              step="0.01"
              defaultValue={item?.acquisitionPrice ?? ''}
            />
          </Field>
          <Field label="eGun shipping within DE (€)">
            <Input
              name="egunDomesticShippingFee"
              type="number"
              step="0.01"
              defaultValue={item?.egunDomesticShippingFee ?? ''}
            />
          </Field>
          <Field label="Sale price to buyer (€)">
            <Input
              name="salePrice"
              type="number"
              step="0.01"
              defaultValue={item?.salePrice ?? ''}
            />
          </Field>
          <Field
            label="Handling fee charged (€)"
            hint={
              !item && isFirearm
                ? 'Blank = your default (rifle/pistol) from the company profile'
                : undefined
            }
          >
            <Input
              name="clientHandlingFee"
              type="number"
              step="0.01"
              defaultValue={item?.clientHandlingFee ?? ''}
            />
          </Field>
        </div>
        <Field label="Notes" className="mt-3">
          <Textarea name="notes" defaultValue={item?.notes ?? ''} rows={2} />
        </Field>
      </details>

      {isFirearm && (
        <details
          open={detailsDefaultOpen}
          className="group border-t border-neutral-200"
        >
          <summary className="cursor-pointer text-sm font-medium select-none text-neutral-600">
            Transfer proforma checkboxes (Loading, Barrel/Hammer, Sights,
            Schedule, purchased for)
          </summary>
          <p className="text-xs text-neutral-500 mt-1 mb-3">
            These match the exact checkbox wording on the Weapons Office
            transfer proforma. Loading, Barrel/Hammer and Sights can all have
            more than one box ticked (the same firearm can be e.g. both
            &quot;Automatic&quot; and &quot;With Ejector/Extractor&quot;) — only
            the Schedule / classification line item below is a single tick.
          </p>
          <div className={grid}>
            <Field label="Loading" hint="Tick as many as apply">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm pt-1">
                {PROFORMA_LOADING_OPTIONS.map(o => (
                  <label
                    key={o.value}
                    className="inline-flex items-center gap-1"
                  >
                    <input
                      type="checkbox"
                      name="proformaLoading"
                      value={o.value}
                      defaultChecked={proformaLoadingSet.has(o.value)}
                    />{' '}
                    {o.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Barrel/Hammer" hint="Tick as many as apply">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm pt-1">
                {PROFORMA_BARREL_HAMMER_OPTIONS.map(o => (
                  <label
                    key={o.value}
                    className="inline-flex items-center gap-1"
                  >
                    <input
                      type="checkbox"
                      name="proformaBarrelHammer"
                      value={o.value}
                      defaultChecked={proformaBarrelHammerSet.has(o.value)}
                    />{' '}
                    {o.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Sights" hint="Tick as many as apply">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm pt-1">
                {SIGHT_OPTIONS.map(s => (
                  <label key={s} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      name="sightsType"
                      value={s}
                      defaultChecked={sights.has(s)}
                    />{' '}
                    {SIGHT_LABELS[s]}
                  </label>
                ))}
              </div>
            </Field>
            <Field
              label={<Req>Schedule / classification line item</Req>}
              hint={
                suggestedScheduleLineItem && !scheduleLineItemCode
                  ? `Suggested: ${SCHEDULE_LINE_ITEMS.find(s => s.code === suggestedScheduleLineItem)?.label}`
                  : 'The dealer must confirm this — it is never auto-filled'
              }
              className="col-span-2"
            >
              <Select
                name="scheduleLineItemCode"
                value={scheduleLineItemCode}
                onChange={e => setScheduleLineItemCode(e.target.value)}
              >
                <option value="">— select the exact line item to tick —</option>
                <optgroup label="Schedule I">
                  {SCHEDULE_LINE_ITEMS.filter(s => s.schedule === 'I').map(
                    s => (
                      <option key={s.code} value={s.code}>
                        {s.label}
                      </option>
                    )
                  )}
                </optgroup>
                <optgroup label="Schedule II">
                  {SCHEDULE_LINE_ITEMS.filter(s => s.schedule === 'II').map(
                    s => (
                      <option key={s.code} value={s.code}>
                        {s.label}
                      </option>
                    )
                  )}
                </optgroup>
                <optgroup label="Schedule III">
                  {SCHEDULE_LINE_ITEMS.filter(s => s.schedule === 'III').map(
                    s => (
                      <option key={s.code} value={s.code}>
                        {s.label}
                      </option>
                    )
                  )}
                </optgroup>
              </Select>
              {suggestedScheduleLineItem && !scheduleLineItemCode && (
                <button
                  type="button"
                  className="mt-1 text-xs text-neutral-600"
                  onClick={() =>
                    setScheduleLineItemCode(suggestedScheduleLineItem)
                  }
                >
                  Use suggested
                </button>
              )}
            </Field>
            <Field label="Purchaser declares this firearm is being purchased for">
              <Select
                name="buyerLicenceType"
                defaultValue={item?.buyerLicenceType ?? ''}
              >
                <option value="">— not set —</option>
                <optgroup label="Target shooter">
                  {PURCHASE_PURPOSE_OPTIONS.filter(o => o.col === 1).map(o => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Collector">
                  {PURCHASE_PURPOSE_OPTIONS.filter(o => o.col === 2).map(o => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  {PURCHASE_PURPOSE_OPTIONS.filter(o => o.col === 3).map(o => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Field label="Buyer licence no.">
              <Input
                name="buyerLicenceNumber"
                defaultValue={item?.buyerLicenceNumber ?? ''}
              />
            </Field>
          </div>
        </details>
      )}

      {isFirearm && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-500">Engine suggests:</span>
          <Badge tone="blue">{preview.scheduleProforma ?? '—'}</Badge>
          <Badge tone="blue">{preview.scheduleImportDoc ?? '—'}</Badge>
          <Badge tone="neutral">EU cat. {preview.euCategory ?? '—'}</Badge>
          {preview.isAntique && (
            <Badge tone="purple">Antique (pre-1946 automatic)</Badge>
          )}
          {item?.scheduleOverridden ? (
            <Badge tone="amber">Manual override in place</Badge>
          ) : null}
        </div>
      )}
      <Warn items={preview.blockers} tone="red" />
      <Warn items={preview.warnings} />
    </ActionForm>
  )
}
