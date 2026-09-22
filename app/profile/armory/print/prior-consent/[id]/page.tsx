import { requireDealerAccount } from '@/lib/armory/auth'
import { getShipment, listItemsForShipment } from '@/lib/armory/queries'

export default async function PriorConsentPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string; blank?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const ctx = await requireDealerAccount()
  const account = ctx.dealerAccount
  const shipment = await getShipment(account.id, id)
  const items = shipment ? await listItemsForShipment(account.id, id) : []
  const firearms = items.filter(i => i.itemType === 'FIREARM')

  return (
    <html>
      <body className="p-8 font-serif text-sm max-w-4xl mx-auto">
        <h1 className="text-lg font-bold mb-4">
          Prior Consent — {shipment?.reference ?? 'Unknown shipment'}
        </h1>
        <p className="text-muted-foreground mb-6">
          Print view stub ({sp.mode ?? 'full'}
          {sp.blank ? ', blank' : ''}). Full form rendering will be added in a
          later update.
        </p>
        <section className="mb-6">
          <h2 className="font-semibold mb-2">Receiving dealer</h2>
          <p>{account.companyName}</p>
          <p>{account.registeredAddress ?? '—'}</p>
          <p>Licence: {account.dealerLicenceNumber ?? '—'}</p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">
            Firearms annex ({firearms.length})
          </h2>
          <table className="w-full border-collapse border text-xs">
            <thead>
              <tr>
                <th className="border p-1">Make</th>
                <th className="border p-1">Model</th>
                <th className="border p-1">Serial</th>
                <th className="border p-1">Calibre</th>
              </tr>
            </thead>
            <tbody>
              {firearms.map(i => (
                <tr key={i.id}>
                  <td className="border p-1">{i.make}</td>
                  <td className="border p-1">{i.model}</td>
                  <td className="border p-1">{i.serialNumber ?? '—'}</td>
                  <td className="border p-1">
                    {i.calibreDisplay ?? i.calibreRaw ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="mt-8 text-xs text-muted-foreground">
          Use your browser print dialog (Ctrl/Cmd+P).
        </p>
      </body>
    </html>
  )
}
