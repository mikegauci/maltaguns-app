import { notFound } from 'next/navigation'
import { requireApprovedDealer } from '@/lib/armory/auth'
import { getShipment, listItemsForShipment } from '@/lib/armory/queries'
import {
  buildPriorConsent,
  recordDocument,
  missingOf,
} from '@/lib/armory/documents'
import { audit } from '@/lib/armory/audit'
import { Cell, Warnings } from '../../fields'

export const dynamic = 'force-dynamic'

type Mode = 'annex' | 'self' | 'full'
function parseMode(v: string | undefined): Mode {
  return v === 'annex' || v === 'self' ? v : 'full'
}

export default async function PriorConsentPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ blank?: string; mode?: string }>
}) {
  const { id: shipmentId } = await params
  const { blank, mode: modeParam } = await searchParams
  const ctx = await requireApprovedDealer()
  const account = ctx.dealerAccount
  const shipment = await getShipment(account.id, shipmentId)
  if (!shipment) notFound()
  const items = await listItemsForShipment(account.id, shipmentId)
  const isBlank = blank === '1'
  const mode = parseMode(modeParam)
  const data = buildPriorConsent(account, shipment, items)
  const showForm = isBlank || mode !== 'annex'
  const showSender = isBlank || mode === 'full'

  function annexRowMissing(r: (typeof data.annex)[number]): string[] {
    const out: string[] = []
    if (!r.serialNumber) out.push(`Serial number — annex item ${r.no}`)
    if (!r.cipProof) out.push(`CIP proof (yes/no) — annex item ${r.no}`)
    if (!r.calibre) out.push(`Calibre — annex item ${r.no}`)
    return out
  }
  const annexMissing =
    data.annex.length === 0
      ? ['At least one firearm or essential component in the shipment']
      : data.annex.flatMap(annexRowMissing)
  const effectiveMissing = isBlank
    ? []
    : mode === 'annex'
      ? annexMissing
      : mode === 'self'
        ? [...missingOf(data.recipient), ...annexMissing]
        : data.missing

  const rec = await recordDocument({
    dealerAccountId: account.id,
    userId: ctx.userId,
    docType: 'PRIOR_CONSENT',
    generationMethod: isBlank ? 'BLANK_MANUAL' : 'AUTO_FILLED',
    shipmentId,
    snapshot: isBlank ? {} : { ...data, mode },
    missing: effectiveMissing,
  })
  await audit('DOCUMENT_GENERATED', {
    userId: ctx.userId,
    dealerAccountId: account.id,
    entityType: 'generated_document',
    entityId: rec.id,
    details: {
      docType: 'PRIOR_CONSENT',
      shipmentId,
      version: rec.version,
      blank: isBlank,
      mode,
      missing: effectiveMissing.length,
    },
  })

  const annexRows = isBlank
    ? Array.from({ length: 12 }, (_, i) => ({ no: i + 1 }))
    : data.annex
  const ANNEX_PER_PAGE = 14
  const firstPageAnnex = annexRows.slice(0, 6)
  const rest = annexRows.slice(6)
  const restPages: (typeof annexRows)[] = []
  for (let i = 0; i < rest.length; i += ANNEX_PER_PAGE)
    restPages.push(rest.slice(i, i + ANNEX_PER_PAGE))

  const annexTable = (rows: typeof annexRows, startNo: number) => (
    <table className="annex">
      <thead>
        <tr>
          <th>No.</th>
          <th>Category</th>
          <th>Quantity / type</th>
          <th>Make / model</th>
          <th>Calibre</th>
          <th>Other features</th>
          <th>CIP proof</th>
          <th>Serial number</th>
          <th>Schedule</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const row = r as Partial<(typeof data.annex)[number]>
          const cellOrMissing = (v: string | undefined, label: string) =>
            isBlank ? '' : v ? v : <span className="missing">{label}</span>
          return (
            <tr key={i}>
              <td className="num">{startNo + i}</td>
              <td>{isBlank ? '' : row.euCategory}</td>
              <td>{isBlank ? '' : row.quantityType}</td>
              <td>{cellOrMissing(row.makeModel, 'make/model')}</td>
              <td>{cellOrMissing(row.calibre, 'calibre')}</td>
              <td>{isBlank ? '' : row.otherFeatures}</td>
              <td>{cellOrMissing(row.cipProof, 'yes/no')}</td>
              <td>{cellOrMissing(row.serialNumber, 'serial')}</td>
              <td>{isBlank ? '' : row.scheduleImportDoc}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  const annexHeading =
    mode === 'annex'
      ? 'Firearms and essential components to be transferred'
      : '4. Firearms and essential components to be transferred'
  const modeNote =
    mode === 'annex'
      ? 'Annex only — attach to a Prior Consent form completed separately'
      : mode === 'self'
        ? 'Recipient details only — sender to be completed separately'
        : null

  return (
    <>
      {!isBlank && (
        <Warnings missing={effectiveMissing} warnings={data.warnings} />
      )}
      <div className="page">
        <p className="doc-title">
          {mode === 'annex'
            ? 'Prior consent — annex'
            : 'Prior consent to the transfer of firearms'}
        </p>
        <p className="doc-subtitle">
          {mode === 'annex'
            ? `Annex to the Prior Consent application under Article 11(4) of Council Directive 91/477/EEC — Shipment ${shipment.reference}`
            : 'Article 11(4) of Council Directive 91/477/EEC (as amended) — application to the Commissioner of Police, Malta · Weapons Office, Police General Headquarters, Floriana'}
        </p>
        {modeNote && (
          <p className="doc-subtitle" style={{ fontStyle: 'italic' }}>
            {modeNote}
          </p>
        )}

        {showForm && (
          <div className="sec">
            <div className="sec-h">1. Member State of destination</div>
            <div className="grid">
              <div className="cell full">
                <span className="val">
                  {isBlank ? (
                    <span className="blank-line" />
                  ) : (
                    data.destinationMemberState
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="sec">
            <div className="sec-h">
              2. Recipient (person or company in Malta receiving the firearms)
            </div>
            <div className="grid">
              {data.recipient.map(f => (
                <Cell
                  key={f.key}
                  f={f}
                  blank={isBlank}
                  full={f.key === 'recipient.address'}
                />
              ))}
            </div>
          </div>
        )}

        {showSender && (
          <div className="sec">
            <div className="sec-h">
              3. Sender (person or company in the Member State of origin)
            </div>
            <div className="grid">
              {data.sender.map(f => (
                <Cell
                  key={f.key}
                  f={f}
                  blank={isBlank}
                  full={f.key === 'sender.address'}
                />
              ))}
            </div>
          </div>
        )}
        {!showSender && showForm && (
          <div className="sec">
            <div className="sec-h">
              3. Sender (person or company in the Member State of origin)
            </div>
            <div className="grid">
              <div className="cell full">
                <span className="val">
                  To be completed by hand — sender details not included on this
                  print
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="sec">
          <div className="sec-h">
            {annexHeading}{' '}
            {!isBlank &&
              `(${data.annex.length} item${data.annex.length === 1 ? '' : 's'}${data.annex.length > 6 ? ' — continued in annex' : ''})`}
          </div>
          <div style={{ padding: '1.5mm' }}>
            {annexTable(firstPageAnnex, 1)}
          </div>
        </div>

        {showForm && (
          <div className="sec">
            <div className="sec-h">5. Declaration of the recipient</div>
            <div className="cell full">
              <span className="val" style={{ fontSize: '9pt' }}>
                I declare that the information above is correct and that I hold
                a valid dealer licence issued under the Arms Act (Cap. 480)
                authorising me to acquire the firearms and essential components
                listed. I undertake to record the transfer and to inform the
                Commissioner of Police as required by law.
              </span>
              <div className="sig-row">
                <div className="sig">Signature and stamp of the recipient</div>
                <div className="sig">Date</div>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="sec">
            <div className="sec-h">
              6. Prior consent of the Member State of destination (for official
              use)
            </div>
            <div className="grid">
              <div className="cell">
                <span className="lbl">Reference</span>
                <span className="val">
                  {isBlank ? '' : (shipment.priorConsentRef ?? '')}
                </span>
              </div>
              <div className="cell">
                <span className="lbl">Date</span>
                <span className="val">
                  {isBlank ? '' : (shipment.priorConsentDate ?? '')}
                </span>
              </div>
              <div className="cell full">
                <div className="stamp-box">
                  Stamp and signature — Commissioner of Police / Weapons Office
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="foot">
          <span>
            Shipment {shipment.reference} · {account.companyName}
          </span>
          <span>
            {isBlank
              ? 'Blank form'
              : `Generated ${new Date(data.generatedAt).toLocaleString('en-MT')} · v${rec.version}`}{' '}
            · MaltaGuns Armory
          </span>
        </div>
      </div>

      {restPages.map((rows, p) => (
        <div className="page" key={p}>
          <p className="doc-title">Prior consent — annex, page {p + 2}</p>
          <p className="doc-subtitle">
            Continuation of section 4 · Recipient: {account.companyName}
            {showSender
              ? ` · Sender: ${shipment.senderCompanyName ?? [shipment.senderFirstNames, shipment.senderSurname].filter(Boolean).join(' ')}`
              : ''}
          </p>
          <div className="sec">
            <div style={{ padding: '1.5mm' }}>
              {annexTable(rows, 7 + p * ANNEX_PER_PAGE)}
            </div>
          </div>
          {showForm && (
            <div className="sig-row">
              <div className="sig">Signature and stamp of the recipient</div>
              <div className="sig">Date</div>
            </div>
          )}
          <div className="foot">
            <span>
              Shipment {shipment.reference} · {account.companyName}
            </span>
            <span>
              Annex page {p + 2} · v{rec.version}
            </span>
          </div>
        </div>
      ))}
    </>
  )
}
