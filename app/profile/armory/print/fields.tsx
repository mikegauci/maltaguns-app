import type { Field } from '@/lib/armory/documents'

export function Cell({
  f,
  blank,
  full,
}: {
  f: Field
  blank?: boolean
  full?: boolean
}) {
  return (
    <div className={'cell' + (full ? ' full' : '')}>
      <span className="lbl">{f.label}</span>
      <span className="val">
        {blank ? (
          <span className="blank-line" />
        ) : f.value ? (
          f.value
        ) : f.required ? (
          <span className="missing">missing: {f.label.toLowerCase()}</span>
        ) : (
          ''
        )}
      </span>
    </div>
  )
}

export function Warnings({
  missing,
  warnings,
}: {
  missing: string[]
  warnings: string[]
}) {
  if (!missing.length && !warnings.length) return null
  return (
    <div className="warnings">
      <strong>Before you print:</strong>
      {missing.length > 0 && (
        <>
          <div>
            Missing ({missing.length}) — these are highlighted on the page:
          </div>
          <ul>
            {missing.map((m, i) => (
              <li key={'m' + i}>{m}</li>
            ))}
          </ul>
        </>
      )}
      {warnings.length > 0 && (
        <>
          <div>Check:</div>
          <ul>
            {warnings.map((w, i) => (
              <li key={'w' + i}>{w}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
