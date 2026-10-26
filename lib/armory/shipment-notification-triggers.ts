export type Trigger = 'PERMIT_APPLIED' | 'SHIPPED' | 'READY_FOR_COLLECTION'

export const TRIGGER_LABEL: Record<Trigger, string> = {
  PERMIT_APPLIED: 'Import permit applied for',
  SHIPPED: 'Shipment left the origin country',
  READY_FOR_COLLECTION: 'Items ready for collection',
}

export const TRIGGER_FOR_STATUS: Partial<
  Record<'PERMIT_APPLIED' | 'SHIPPED' | 'READY_FOR_COLLECTION', Trigger>
> = {
  PERMIT_APPLIED: 'PERMIT_APPLIED',
  SHIPPED: 'SHIPPED',
  READY_FOR_COLLECTION: 'READY_FOR_COLLECTION',
}

export function renderTemplate(
  trigger: Trigger,
  vars: {
    dealer: string
    buyer: string
    items: string
    reference: string
  }
): string {
  switch (trigger) {
    case 'PERMIT_APPLIED':
      return `${vars.dealer}: Hi ${vars.buyer}, the import permit for your item(s) (${vars.items}) in shipment ${vars.reference} has been applied for with the Malta Police. We'll update you when the box ships.`
    case 'SHIPPED':
      return `${vars.dealer}: Hi ${vars.buyer}, shipment ${vars.reference} containing your item(s) (${vars.items}) has left the origin country and is on its way to Malta.`
    case 'READY_FOR_COLLECTION':
      return `${vars.dealer}: Hi ${vars.buyer}, your item(s) (${vars.items}) from shipment ${vars.reference} are ready. Please get in touch to arrange the transfer at the Weapons Office and collection.`
  }
}

function providerConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
}

export function notificationsConfigured() {
  return providerConfigured()
}
