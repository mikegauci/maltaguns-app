'use client'

export function PrintButton() {
  return (
    <div className="print-toolbar no-print">
      <button type="button" onClick={() => window.print()}>
        Print / save as PDF
      </button>
      <span>
        Check the highlighted fields before printing. Signatures and the dealer
        stamp are added by hand.
      </span>
    </div>
  )
}
