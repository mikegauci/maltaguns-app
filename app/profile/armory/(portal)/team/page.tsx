import { redirect } from 'next/navigation'
import { requireDealerAccount } from '@/lib/armory/auth'
import { listStaff } from '@/lib/armory/queries'
import { createStaff, disableStaff } from '@/lib/armory/actions/dealer'
import { ActionForm, ActionButton } from '@/components/armory/action-form'
import {
  Card,
  Field,
  Input,
  Table,
  th,
  td,
  Badge,
} from '@/components/armory/ui'

export default async function TeamPage() {
  const ctx = await requireDealerAccount()
  if (ctx.staffRole !== 'owner') redirect('/profile/armory')
  const staff = await listStaff(ctx.dealerAccount.id)

  return (
    <>
      <Card
        title="Team"
        description="Staff can manage shipments, items and buyers. Only the owner manages the team and company profile."
      >
        <Table>
          <thead>
            <tr>
              <th className={th}>User</th>
              <th className={th}>Role</th>
              <th className={th}>Status</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {staff.map(u => (
              <tr key={u.id}>
                <td className={td}>
                  {u.name ?? '—'}
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className={td}>
                  <Badge tone={u.role === 'owner' ? 'blue' : 'neutral'}>
                    {u.role === 'owner' ? 'Owner' : 'Staff'}
                  </Badge>
                </td>
                <td className={td}>
                  {u.disabledAt ? (
                    <Badge tone="red">disabled</Badge>
                  ) : (
                    <Badge tone="green">active</Badge>
                  )}
                </td>
                <td className={td}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card
        title="Invite staff member"
        description="They must already have a MaltaGuns account with this email."
      >
        <ActionForm
          action={createStaff}
          submitLabel="Invite staff"
          resetOnSuccess
        >
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Name">
              <Input name="name" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </>
  )
}
