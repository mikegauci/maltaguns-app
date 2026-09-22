import { requireDealerAccount } from '@/lib/armory/auth'
import { ALLOCATION_METHODS } from '@/lib/armory/accounting'
import { updateProfile } from '@/lib/armory/actions/dealer'
import { ActionForm } from '@/components/armory/action-form'
import { Card, Field, Input, Select, Badge } from '@/components/armory/ui'

export default async function ProfilePage() {
  const ctx = await requireDealerAccount()
  const account = ctx.dealerAccount
  const owner = ctx.staffRole === 'owner'

  return (
    <Card
      title="Company profile"
      description="These details are printed on every Prior Consent and transfer proforma."
      actions={
        <Badge
          tone={
            account.accountStatus === 'APPROVED'
              ? 'green'
              : account.accountStatus === 'PENDING'
                ? 'amber'
                : 'red'
          }
        >
          {account.accountStatus}
        </Badge>
      }
    >
      <ActionForm action={updateProfile} submitLabel="Save profile">
        <fieldset disabled={!owner} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Company name">
              <Input
                name="companyName"
                defaultValue={account.companyName}
                required
              />
            </Field>
            <Field label="Dealer licence number">
              <Input
                name="dealerLicenceNumber"
                defaultValue={account.dealerLicenceNumber ?? ''}
                required
              />
            </Field>
            <Field label="Licence expiry">
              <Input
                name="dealerLicenceExpiry"
                type="date"
                defaultValue={account.dealerLicenceExpiry ?? ''}
              />
            </Field>
            <Field label="Contact surname">
              <Input
                name="contactSurname"
                defaultValue={account.contactSurname ?? ''}
              />
            </Field>
            <Field label="Contact first name(s)">
              <Input
                name="contactFirstNames"
                defaultValue={account.contactFirstNames ?? ''}
              />
            </Field>
            <Field label="Date of birth">
              <Input
                name="contactDateOfBirth"
                type="date"
                defaultValue={account.contactDateOfBirth ?? ''}
              />
            </Field>
            <Field label="Place of birth">
              <Input
                name="contactPlaceOfBirth"
                defaultValue={account.contactPlaceOfBirth ?? ''}
              />
            </Field>
            <Field label="Passport / ID number">
              <Input
                name="passportIdNumber"
                defaultValue={account.passportIdNumber ?? ''}
              />
            </Field>
            <Field label="Passport / ID issue date">
              <Input
                name="passportIssueDate"
                type="date"
                defaultValue={account.passportIssueDate ?? ''}
              />
            </Field>
            <Field label="Issuing authority">
              <Input
                name="passportIssuingAuthority"
                defaultValue={account.passportIssuingAuthority ?? ''}
                placeholder="e.g. Identità, Malta"
              />
            </Field>
            <Field label="Registered address" className="col-span-2">
              <Input
                name="registeredAddress"
                defaultValue={account.registeredAddress ?? ''}
              />
            </Field>
            <Field label="Telephone">
              <Input
                name="phoneNumber"
                defaultValue={account.phoneNumber ?? ''}
              />
            </Field>
            <Field label="Fax">
              <Input name="faxNumber" defaultValue={account.faxNumber ?? ''} />
            </Field>
          </div>
          <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Shipping cost allocation" className="md:col-span-3">
              <Select
                name="shippingAllocationMethod"
                defaultValue={account.shippingAllocationMethod}
              >
                {ALLOCATION_METHODS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default handling fee — rifles (€)">
              <Input
                name="defaultHandlingFeeRifle"
                type="number"
                step="0.01"
                defaultValue={account.defaultHandlingFeeRifle ?? 100}
              />
            </Field>
            <Field label="Default handling fee — pistols (€)">
              <Input
                name="defaultHandlingFeePistol"
                type="number"
                step="0.01"
                defaultValue={account.defaultHandlingFeePistol ?? 60}
              />
            </Field>
          </div>
        </fieldset>
      </ActionForm>
      {!owner && (
        <p className="text-xs text-muted-foreground mt-2">
          Only the account owner can edit the company profile.
        </p>
      )}
    </Card>
  )
}
