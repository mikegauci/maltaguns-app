import {
  normaliseHeader,
  parseWorkbook,
  type ParsedSheet,
} from '@/lib/armory/import'

export { parseWorkbook, normaliseHeader, type ParsedSheet }

export const PERSONAL_IMPORT_TARGETS: {
  key: string
  label: string
  aliases: string[]
}[] = [
  {
    key: 'make',
    label: 'Make',
    aliases: ['make', 'manufacturer', 'brand', 'hersteller', 'marke'],
  },
  { key: 'model', label: 'Model', aliases: ['model', 'modell'] },
  {
    key: 'calibre',
    label: 'Calibre',
    aliases: ['calibre', 'caliber', 'cal', 'kaliber'],
  },
  {
    key: 'serialNumber',
    label: 'Serial number',
    aliases: [
      'serial',
      'serial number',
      'serial no',
      's/n',
      'sn',
      'seriennummer',
    ],
  },
  {
    key: 'category',
    label: 'Type / category',
    aliases: [
      'type',
      'category',
      'firearm type',
      'item type',
      'kind',
      'waffenart',
    ],
  },
  {
    key: 'price',
    label: 'Purchase price',
    aliases: [
      'price',
      'cost',
      'purchase',
      'purchase price',
      'kaufpreis',
      'paid',
    ],
  },
  {
    key: 'estimatedValue',
    label: 'Estimated value',
    aliases: ['estimated value', 'est value', 'value', 'schätzwert'],
  },
  {
    key: 'seller',
    label: 'Seller',
    aliases: ['seller', 'vendor', 'verkäufer', 'from'],
  },
  {
    key: 'egunNo',
    label: 'eGun listing ID',
    aliases: ['egun', 'egun no', 'egun id', 'listing id', 'listing'],
  },
  {
    key: 'acquisitionDate',
    label: 'Acquisition date',
    aliases: [
      'acquired',
      'acquisition',
      'date',
      'received date',
      'purchase date',
    ],
  },
  {
    key: 'notes',
    label: 'Notes',
    aliases: [
      'notes',
      'collectors report',
      'description',
      'remarks',
      'bemerkung',
    ],
  },
]

export function guessPersonalMapping(
  headers: string[]
): Record<number, string> {
  const map: Record<number, string> = {}
  const used = new Set<string>()
  headers.forEach((h, i) => {
    const n = normaliseHeader(h)
    if (!n) return
    let best: { key: string; score: number } | null = null
    for (const t of PERSONAL_IMPORT_TARGETS) {
      if (used.has(t.key)) continue
      for (const a of t.aliases) {
        let score = 0
        if (n === a) score = 3
        else if (n.startsWith(a) || n.endsWith(a)) score = 2
        else if (n.includes(a)) score = 1
        if (score > (best?.score ?? 0)) best = { key: t.key, score }
      }
    }
    if (best && best.score >= 1) {
      map[i] = best.key
      used.add(best.key)
    }
  })
  return map
}

function formatCellValue(key: string, value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'n/a') return ''
  if (key === 'egunNo' && /e/i.test(trimmed)) {
    const n = parseFloat(trimmed)
    if (!Number.isNaN(n)) return String(Math.round(n))
  }
  if (key === 'serialNumber' && /^\d+\.0$/.test(trimmed)) {
    return trimmed.replace(/\.0$/, '')
  }
  return trimmed
}

function personalItemType(category: string): 'FIREARM' | 'NON_FIREARM' {
  const t = category.toLowerCase()
  if (
    /mag|holster|ammo|ammunition|accessory|case|scope|sling|cleaning|target|part\b/.test(
      t
    )
  )
    return 'NON_FIREARM'
  return 'FIREARM'
}

function parseAcquisitionDate(value: string): string | null {
  if (!value || value === '1' || value === '0') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function buildNotes(rec: Record<string, string>): string | null {
  const parts: string[] = []
  if (rec.price) parts.push(`Price: €${rec.price}`)
  if (rec.estimatedValue) parts.push(`Est. value: €${rec.estimatedValue}`)
  if (rec.seller) parts.push(`Seller: ${rec.seller}`)
  if (rec.egunNo) parts.push(`eGun: ${rec.egunNo}`)
  if (rec.category) parts.push(`Type: ${rec.category}`)
  if (rec.notes) parts.push(rec.notes)
  return parts.length ? parts.join('\n') : null
}

export type PersonalImportRow = {
  item_type: 'FIREARM' | 'NON_FIREARM'
  make: string | null
  model: string | null
  calibre: string | null
  serial_number: string | null
  acquisition_date: string | null
  notes: string | null
}

export function mapPersonalRows(
  headers: string[],
  rows: string[][],
  mapping: Record<number, string>
): PersonalImportRow[] {
  const out: PersonalImportRow[] = []
  for (const row of rows) {
    const rec: Record<string, string> = {}
    for (const [col, target] of Object.entries(mapping)) {
      rec[target] = formatCellValue(target, row[Number(col)] ?? '')
    }
    if (!rec.make && !rec.model && !rec.serialNumber) continue
    out.push({
      item_type: personalItemType(rec.category ?? ''),
      make: rec.make || null,
      model: rec.model || null,
      calibre: rec.calibre || null,
      serial_number: rec.serialNumber || null,
      acquisition_date: parseAcquisitionDate(rec.acquisitionDate ?? ''),
      notes: buildNotes(rec),
    })
  }
  return out
}

export function parsePersonalImport(
  headers: string[],
  rows: string[][]
): { mapping: Record<number, string>; items: PersonalImportRow[] } {
  const mapping = guessPersonalMapping(headers)
  const items = mapPersonalRows(headers, rows, mapping)
  return { mapping, items }
}
