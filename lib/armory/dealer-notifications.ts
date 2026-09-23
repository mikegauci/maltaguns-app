import { createAndEmailNotification } from '@/lib/notify-created'
import { sendNotificationEmail } from '@/lib/notification-email'

export const ADMIN_SUPPORT_EMAIL = 'support@maltaguns.com'

type DealerRegistrationAccount = {
  id: string
  owner_id: string
  company_name: string
  dealer_licence_number: string | null
  dealer_licence_expiry: string | null
  email: string | null
  contact_first_names?: string | null
  contact_surname?: string | null
  phone_number?: string | null
  created_at?: string
}

export async function notifyAdminOfDealerRegistration(
  account: DealerRegistrationAccount
): Promise<{ ok: boolean }> {
  try {
    const ownerName = [account.contact_first_names, account.contact_surname]
      .filter(Boolean)
      .join(' ')
    const ownerEmail = account.email ?? 'Unknown'
    const licenceNumber = account.dealer_licence_number ?? '—'
    const licenceExpiry = account.dealer_licence_expiry ?? '—'

    const body = [
      `${account.company_name} has submitted an Armory dealership registration and is awaiting review.`,
      `Owner: ${ownerName || ownerEmail}`,
      `Email: ${ownerEmail}`,
      account.phone_number ? `Phone: ${account.phone_number}` : null,
      `Licence: ${licenceNumber}`,
      `Licence expiry: ${licenceExpiry}`,
    ]
      .filter(Boolean)
      .join(' ')

    const result = await sendNotificationEmail({
      notification: {
        id: account.id,
        user_id: account.owner_id,
        type: 'armory_dealer_registration',
        title: `New Armory dealership registration: ${account.company_name}`,
        body,
        link_url: '/admin/armory-dealers?status=pending',
        created_at: account.created_at ?? new Date().toISOString(),
      },
      to: ADMIN_SUPPORT_EMAIL,
    })

    if (!result.success) {
      console.error(
        '[armory-dealer-notifications] Admin registration email failed:',
        result.error
      )
      return { ok: false }
    }

    return { ok: true }
  } catch (error) {
    console.error(
      '[armory-dealer-notifications] Admin registration email error:',
      error
    )
    return { ok: false }
  }
}

export async function notifyDealerOwnerOfStatusChange(params: {
  dealerAccountId: string
  ownerId: string
  companyName: string
  status: 'approved' | 'suspended'
  note?: string | null
}): Promise<{ ok: boolean }> {
  const { dealerAccountId, ownerId, companyName, status, note } = params

  try {
    if (status === 'approved') {
      const result = await createAndEmailNotification({
        userId: ownerId,
        type: 'armory_dealer_approved',
        title: 'Your Armory dealership has been approved',
        body: `${companyName} is approved. You now have full access to shipments, inventory, and the rest of the Armory platform.`,
        linkUrl: '/profile/armory',
        dedupeKey: `armory-dealer-approved:${dealerAccountId}`,
      })
      return { ok: result.ok }
    }

    const noteSuffix = note?.trim()
      ? ` Note from the admin: ${note.trim()}`
      : ''

    const result = await createAndEmailNotification({
      userId: ownerId,
      type: 'armory_dealer_suspended',
      title: 'Your Armory dealership has been suspended',
      body: `${companyName} has been suspended. Armory access is restricted until the account is reinstated.${noteSuffix}`,
      linkUrl: '/profile/armory/company-profile',
      dedupeKey: `armory-dealer-suspended:${dealerAccountId}`,
    })
    return { ok: result.ok }
  } catch (error) {
    console.error(
      '[armory-dealer-notifications] Owner status email error:',
      error
    )
    return { ok: false }
  }
}
