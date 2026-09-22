import { requireDealerAccount } from '@/lib/armory/auth'
import { getItem } from '@/lib/armory/queries'

export default async function ProformaPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string; blank?: string }>
}) {
  const sp = await searchParams
  const ctx = await requireDealerAccount()
  const ids = (sp.items ?? '').split(',').filter(Boolean)
  const items = await Promise.all(
    ids.map(id => getItem(ctx.dealerAccount.id, id))
  )
  const valid = items.filter(Boolean)

  return (
    <html>
      <body className="p-8 font-serif text-sm max-w-4xl mx-auto">
        <h1 className="text-lg font-bold mb-4">Transfer Proforma</h1>
        <p className="text-muted-foreground mb-6">
          Print view stub{sp.blank ? ' (blank form)' : ''}. Full Weapons Office
          form rendering will be added later.
        </p>
        <p className="mb-4">
          Transferor: {ctx.dealerAccount.companyName} · Licence{' '}
          {ctx.dealerAccount.dealerLicenceNumber ?? '—'}
        </p>
        {valid.map(item =>
          item ? (
            <section key={item.id} className="mb-8 border p-4 break-after-page">
              <h2 className="font-semibold mb-2">
                {[item.make, item.model].filter(Boolean).join(' ')} · s/n{' '}
                {item.serialNumber ?? '—'}
              </h2>
              <p>Calibre: {item.calibreDisplay ?? item.calibreRaw ?? '—'}</p>
              <p>Buyer: {item.buyerName ?? '—'}</p>
              <p>Licence: {item.buyerLicenceNumber ?? '—'}</p>
            </section>
          ) : null
        )}
        <p className="mt-8 text-xs text-muted-foreground">
          Use your browser print dialog (Ctrl/Cmd+P).
        </p>
      </body>
    </html>
  )
}
