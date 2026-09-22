import { redirect } from 'next/navigation'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { SectionCard } from '@/components/armory/section-card'
import { FormField } from '@/components/armory/form-field'
import { StatusBadge } from '@/components/armory/status-badge'
import { ActionForm, ActionButton } from '@/components/armory/action-form'
import { requireDealerAccount } from '@/lib/armory/auth'
import { listStaff } from '@/lib/armory/queries'
import { createStaff, disableStaff } from '@/lib/armory/actions/dealer'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function TeamPage() {
  const ctx = await requireDealerAccount()
  if (ctx.staffRole !== 'owner') redirect('/profile/armory')
  const staff = await listStaff(ctx.dealerAccount.id)

  return (
    <ProfilePageLayout
      title="Team"
      description="Staff can manage shipments, items and buyers. Only the owner manages the team and company profile."
    >
      <SectionCard title="Team members">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    {u.name ?? '—'}
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={u.role === 'owner' ? 'blue' : 'neutral'}>
                      {u.role === 'owner' ? 'Owner' : 'Staff'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {u.disabledAt ? (
                      <StatusBadge tone="red">disabled</StatusBadge>
                    ) : (
                      <StatusBadge tone="green">active</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.role === 'staff' && !u.disabledAt && (
                      <ActionButton
                        small
                        variant="danger"
                        action={disableStaff.bind(null, u.id)}
                        confirm={`Disable ${u.email}?`}
                      >
                        Disable
                      </ActionButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        title="Invite staff member"
        description="They must already have a MaltaGuns account with this email."
      >
        <ActionForm
          action={createStaff}
          submitLabel="Invite staff"
          resetOnSuccess
        >
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Name">
              <Input name="name" required />
            </FormField>
            <FormField label="Email">
              <Input name="email" type="email" required />
            </FormField>
          </div>
        </ActionForm>
      </SectionCard>
    </ProfilePageLayout>
  )
}
