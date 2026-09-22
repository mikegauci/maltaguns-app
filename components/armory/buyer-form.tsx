import { ActionForm, type ActionResult } from '@/components/armory/action-form'
import { Field, Input, Textarea } from '@/components/armory/ui'
import type { BuyerRow } from '@/lib/armory/types'

export const LICENCE_TYPES = [
  'Collector A',
  'Collector A Special',
  'TSA',
  'TSA Special',
  'TSB',
  'Hunter',
  'Dealer',
  'Other',
]

export function BuyerForm({
  action,
  buyer,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<ActionResult | void>
  buyer?: BuyerRow | null
  submitLabel: string
}) {
  const licences = new Set(
    (buyer?.licenceType ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  )
  return (
    <ActionForm
      action={action}
      submitLabel={submitLabel}
      resetOnSuccess={!buyer}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="First name(s)">
          <Input
            name="firstNames"
            defaultValue={buyer?.firstNames ?? ''}
            required
          />
        </Field>
        <Field label="Surname">
          <Input name="surname" defaultValue={buyer?.surname ?? ''} required />
        </Field>
        <Field
          label="Nickname"
          hint="Optional — a quick way to spot this buyer"
        >
          <Input name="nickname" defaultValue={buyer?.nickname ?? ''} />
        </Field>
        <Field label="ID card / passport no.">
          <Input
            name="passportIdNumber"
            defaultValue={buyer?.passportIdNumber ?? ''}
          />
        </Field>
        <Field
          label="Licence type(s)"
          className="col-span-2 md:col-span-3"
          hint="A buyer can hold more than one"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm pt-1">
            {LICENCE_TYPES.map(l => (
              <label key={l} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  name="licenceType"
                  value={l}
                  defaultChecked={licences.has(l)}
                />{' '}
                {l}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Licence number">
          <Input
            name="licenceNumber"
            defaultValue={buyer?.licenceNumber ?? ''}
          />
        </Field>
        <Field
          label="Phone (for WhatsApp/SMS)"
          hint="8-digit Maltese numbers get +356 added"
        >
          <Input
            name="phoneNumber"
            defaultValue={buyer?.phoneNumber ?? ''}
            placeholder="+356 …"
          />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={buyer?.email ?? ''} />
        </Field>
        <Field label="Address" className="col-span-2">
          <Input name="address" defaultValue={buyer?.address ?? ''} />
        </Field>
        <Field label="Notifications (buyer consent)">
          <div className="flex gap-4 text-sm pt-2">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                name="whatsappOptIn"
                defaultChecked={!!buyer?.whatsappOptIn}
              />{' '}
              WhatsApp
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                name="smsOptIn"
                defaultChecked={!!buyer?.smsOptIn}
              />{' '}
              SMS
            </label>
          </div>
        </Field>
        <Field label="Notes" className="col-span-2">
          <Textarea name="notes" defaultValue={buyer?.notes ?? ''} rows={2} />
        </Field>
      </div>
    </ActionForm>
  )
}
