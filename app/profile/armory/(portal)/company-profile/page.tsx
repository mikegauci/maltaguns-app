import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { FormField } from '@/components/armory/form-field'
import { StatusBadge } from '@/components/armory/status-badge'
import { NativeSelect } from '@/components/armory/native-select'
import { ActionForm } from '@/components/armory/action-form'
import { requireDealerAccount } from '@/lib/armory/auth'
import { ALLOCATION_METHODS } from '@/lib/armory/accounting'
import { updateProfile } from '@/lib/armory/actions/dealer'
import { Input } from '@/components/ui/input'

export default async function ArmoryCompanyProfilePage() {
  const ctx = await requireDealerAccount()
  const account = ctx.dealerAccount
  const owner = ctx.staffRole === 'owner'

  return (
    <ProfilePageLayout
      title="Company profile"
      description="These details are printed on every Prior Consent and transfer proforma."
    >
      <SectionCard
        actions={
          <StatusBadge
            tone={
              account.accountStatus === 'APPROVED'
                ? 'green'
                : account.accountStatus === 'PENDING'
                  ? 'amber'
                  : 'red'
            }
          >
            {account.accountStatus}
          </StatusBadge>
        }
      >
        <ActionForm action={updateProfile} submitLabel="Save profile">
          <fieldset disabled={!owner} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <FormField label="Company name">
                <Input
                  name="companyName"
                  defaultValue={account.companyName}
                  required
                />
              </FormField>
              <FormField label="Dealer licence number">
                <Input
                  name="dealerLicenceNumber"
                  defaultValue={account.dealerLicenceNumber ?? ''}
                  required
                />
              </FormField>
              <FormField label="Licence expiry">
                <Input
                  name="dealerLicenceExpiry"
                  type="date"
                  defaultValue={account.dealerLicenceExpiry ?? ''}
                />
              </FormField>
              <FormField label="Contact surname">
                <Input
                  name="contactSurname"
                  defaultValue={account.contactSurname ?? ''}
                />
              </FormField>
              <FormField label="Contact first name(s)">
                <Input
                  name="contactFirstNames"
                  defaultValue={account.contactFirstNames ?? ''}
                />
              </FormField>
              <FormField label="Date of birth">
                <Input
                  name="contactDateOfBirth"
                  type="date"
                  defaultValue={account.contactDateOfBirth ?? ''}
                />
              </FormField>
              <FormField label="Place of birth">
                <Input
                  name="contactPlaceOfBirth"
                  defaultValue={account.contactPlaceOfBirth ?? ''}
                />
              </FormField>
              <FormField label="Passport / ID number">
                <Input
                  name="passportIdNumber"
                  defaultValue={account.passportIdNumber ?? ''}
                />
              </FormField>
              <FormField label="Passport / ID issue date">
                <Input
                  name="passportIssueDate"
                  type="date"
                  defaultValue={account.passportIssueDate ?? ''}
                />
              </FormField>
              <FormField label="Issuing authority">
                <Input
                  name="passportIssuingAuthority"
                  defaultValue={account.passportIssuingAuthority ?? ''}
                  placeholder="e.g. Identità, Malta"
                />
              </FormField>
              <FormField label="Registered address" className="col-span-2">
                <Input
                  name="registeredAddress"
                  defaultValue={account.registeredAddress ?? ''}
                />
              </FormField>
              <FormField label="Telephone">
                <Input
                  name="phoneNumber"
                  defaultValue={account.phoneNumber ?? ''}
                />
              </FormField>
              <FormField label="Fax">
                <Input
                  name="faxNumber"
                  defaultValue={account.faxNumber ?? ''}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-3">
              <FormField
                label="Shipping cost allocation"
                className="md:col-span-3"
              >
                <NativeSelect
                  name="shippingAllocationMethod"
                  defaultValue={account.shippingAllocationMethod}
                >
                  {ALLOCATION_METHODS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Default handling fee — rifles (€)">
                <Input
                  name="defaultHandlingFeeRifle"
                  type="number"
                  step="0.01"
                  defaultValue={account.defaultHandlingFeeRifle ?? 100}
                />
              </FormField>
              <FormField label="Default handling fee — pistols (€)">
                <Input
                  name="defaultHandlingFeePistol"
                  type="number"
                  step="0.01"
                  defaultValue={account.defaultHandlingFeePistol ?? 60}
                />
              </FormField>
            </div>
          </fieldset>
        </ActionForm>
        {!owner && (
          <p className="mt-2 text-xs text-muted-foreground">
            Only the account owner can edit the company profile.
          </p>
        )}
      </SectionCard>
    </ProfilePageLayout>
  )
}
