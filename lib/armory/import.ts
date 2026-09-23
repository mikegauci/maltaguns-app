// Spreadsheet onboarding: parse a dealer's existing Excel / CSV inventory
// sheet, guess which column is which, let the dealer confirm, then create
// the items through the same classification engine as manual entry.
import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'

export type ParsedSheet = {
  sheetName: string
  headers: string[]
  rows: string[][]
}

export const IMPORT_TARGETS: {
  key: string
  label: string
  aliases: string[]
}[] = [
  {
    key: 'egunListingId',
    label: 'eGun listing ID',
    aliases: [
      'egun',
      'egun id',
      'egun no',
      'listing',
      'listing id',
      'auction',
      'artikel',
    ],
  },
  {
    key: 'buyerInitials',
    label: 'Buyer initials / name',
    aliases: [
      'buyer',
      'initials',
      'client',
      'customer',
      'for',
      'owner',
      'name',
    ],
  },
  {
    key: 'itemType',
    label: 'Item type (firearm/component/accessory)',
    aliases: ['type of item', 'item type', 'kind'],
  },
  {
    key: 'category',
    label: 'Firearm type (pistol/rifle/…)',
    aliases: ['type', 'category', 'firearm type', 'art', 'waffenart'],
  },
  {
    key: 'make',
    label: 'Make',
    aliases: ['make', 'manufacturer', 'brand', 'hersteller', 'marke'],
  },
  { key: 'model', label: 'Model', aliases: ['model', 'modell'] },
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
      'serien',
    ],
  },
  {
    key: 'calibreRaw',
    label: 'Calibre',
    aliases: ['calibre', 'caliber', 'cal', 'kaliber'],
  },
  {
    key: 'countryOfManufacture',
    label: 'Country of manufacture',
    aliases: [
      'country',
      'origin',
      'country of manufacture',
      'herkunft',
      'land',
    ],
  },
  {
    key: 'yearOfManufacture',
    label: 'Year of manufacture',
    aliases: ['year', 'year of manufacture', 'yom', 'baujahr', 'jahr'],
  },
  {
    key: 'capacity',
    label: 'Ammunition capacity',
    aliases: [
      'capacity',
      'ammo capacity',
      'magazine',
      'mag capacity',
      'kapazität',
    ],
  },
  {
    key: 'fireMode',
    label: 'Fire mode',
    aliases: ['fire mode', 'action', 'auto', 'automatic', 'semi'],
  },
  {
    key: 'cipProof',
    label: 'CIP proof (yes/no)',
    aliases: ['cip', 'cip proof', 'proof', 'beschuss'],
  },
  {
    key: 'acquisitionPrice',
    label: 'Purchase price (€)',
    aliases: [
      'price',
      'cost',
      'purchase',
      'purchase price',
      'acquisition',
      'preis',
      'kaufpreis',
      'paid',
    ],
  },
  {
    key: 'egunDomesticShippingFee',
    label: 'eGun shipping fee (€)',
    aliases: [
      'shipping',
      'egun shipping',
      'versand',
      'versandkosten',
      'shipping fee',
    ],
  },
  {
    key: 'salePrice',
    label: 'Sale price (€)',
    aliases: ['sale', 'sale price', 'sold for', 'sold', 'verkauf'],
  },
  {
    key: 'clientHandlingFee',
    label: 'Handling fee charged (€)',
    aliases: ['handling', 'handling fee', 'fee', 'import fee', 'our fee'],
  },
  {
    key: 'originalSeller',
    label: 'Original seller',
    aliases: ['seller', 'vendor', 'verkäufer', 'from'],
  },
  {
    key: 'descriptionRaw',
    label: 'Description / notes',
    aliases: [
      'description',
      'notes',
      'note',
      'comments',
      'remarks',
      'beschreibung',
      'bemerkung',
    ],
  },
  {
    key: 'quantity',
    label: 'Quantity',
    aliases: ['qty', 'quantity', 'anzahl', 'menge'],
  },
]

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map(r => r.text).join('')
    if ('text' in v) return String(v.text)
    if ('result' in v)
      return v.result === undefined || v.result === null ? '' : String(v.result)
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if ('hyperlink' in v) {
      const hv = v as { text?: unknown; hyperlink?: unknown }
      return String(hv.text ?? hv.hyperlink ?? '')
    }
  }
  return String(v)
}

function sheetFromRows(
  sheetName: string,
  rows: string[][]
): ParsedSheet | null {
  if (rows.length === 0) return null
  const hIdx = Math.max(
    0,
    rows.findIndex(r => r.filter(Boolean).length >= 3)
  )
  const headers = rows[hIdx].map((h, i) => h || `Column ${i + 1}`)
  const body = rows.slice(hIdx + 1).filter(r => r.some(Boolean))
  if (body.length === 0) return null
  return { sheetName, headers, rows: body }
}

function parseLegacyXls(buffer: Buffer): ParsedSheet[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheets: ParsedSheet[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
      header: 1,
      defval: '',
      raw: false,
    })
    const rows = raw.map(r =>
      r.map(c => (c === null || c === undefined ? '' : String(c).trim()))
    )
    const sheet = sheetFromRows(sheetName, rows)
    if (sheet) sheets.push(sheet)
  }
  return sheets
}

export async function parseWorkbook(
  buffer: Buffer,
  fileName: string
): Promise<ParsedSheet[]> {
  if (/\.csv$/i.test(fileName)) {
    return [parseCsv(buffer.toString('utf8'))]
  }
  if (/\.xls$/i.test(fileName) && !/\.xlsx$/i.test(fileName)) {
    return parseLegacyXls(buffer)
  }
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as unknown as ArrayBuffer)
  const sheets: ParsedSheet[] = []
  wb.eachSheet(ws => {
    const rows: string[][] = []
    ws.eachRow({ includeEmpty: false }, row => {
      const vals: string[] = []
      for (let c = 1; c <= row.cellCount; c++)
        vals.push(cellText(row.getCell(c).value).trim())
      rows.push(vals)
    })
    const sheet = sheetFromRows(ws.name, rows)
    if (sheet) sheets.push(sheet)
  })
  return sheets
}

export function parseCsv(text: string): ParsedSheet {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const split = (l: string) => {
    const out: string[] = []
    let cur = ''
    let q = false
    for (let i = 0; i < l.length; i++) {
      const ch = l[i]
      if (ch === '"') {
        if (q && l[i + 1] === '"') {
          cur += '"'
          i++
        } else q = !q
      } else if ((ch === ',' || ch === ';') && !q) {
        out.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    out.push(cur.trim())
    return out
  }
  const rows = lines.map(split)
  const hIdx = Math.max(
    0,
    rows.findIndex(r => r.filter(Boolean).length >= 3)
  )
  // Google Sheets (and others) export trailing/blank lines as rows of bare
  // commas ("...,,,,,") which pass the line filter above (they're non-empty
  // strings) but carry no data. parseWorkbook() already drops these for
  // .xlsx; do the same here so the review screen isn't full of empty rows.
  const body = rows.slice(hIdx + 1).filter(r => r.some(Boolean))
  return {
    sheetName: 'CSV',
    headers: rows[hIdx].map((h, i) => h || `Column ${i + 1}`),
    rows: body,
  }
}

export function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9äöüß/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Guess a target field for each header. `remembered` is a dealer's
 * previously-confirmed header→field choices (normalised header text as the
 * key) — an exact match there wins outright, since a dealer correcting the
 * same sheet's headers every import is exactly what this is for. Falls back
 * to alias scoring against IMPORT_TARGETS for anything not remembered.
 */
export function guessMapping(
  headers: string[],
  remembered?: Record<string, string>
): Record<number, string> {
  const map: Record<number, string> = {}
  const used = new Set<string>()
  headers.forEach((h, i) => {
    const n = normaliseHeader(h)
    if (!n) return
    if (remembered?.[n] && !used.has(remembered[n])) {
      map[i] = remembered[n]
      used.add(remembered[n])
      return
    }
    let best: { key: string; score: number } | null = null
    for (const t of IMPORT_TARGETS) {
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

export function toNumber(s: string | undefined): number | null {
  if (!s) return null
  const m = s
    .replace(/[€$£\s]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
    .match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export function guessItemType(
  row: Record<string, string>
): 'FIREARM' | 'REGULATED_COMPONENT' | 'ACCESSORY' {
  const explicit = (row.itemType ?? '').toLowerCase()
  if (explicit) {
    if (/comp|barrel|receiver|frame|slide|bolt|essential/.test(explicit))
      return 'REGULATED_COMPONENT'
    if (/acc|mag|tool|sling|holster|case|part/.test(explicit))
      return 'ACCESSORY'
    if (/fire|gun|pistol|rifle|shotgun|weapon/.test(explicit)) return 'FIREARM'
  }
  const text =
    `${row.category ?? ''} ${row.make ?? ''} ${row.model ?? ''} ${row.descriptionRaw ?? ''}`.toLowerCase()
  if (
    /\b(barrel|lauf|receiver|frame|slide|bolt|breech|cylinder|upper|essential)\b/.test(
      text
    )
  )
    return 'REGULATED_COMPONENT'
  if (
    /\b(magazine|mag|magazin|sling|holster|tool|case|spent|cases|brass|hülsen|scope|optic|bipod|grip|stock|cleaning)\b/.test(
      text
    )
  )
    return 'ACCESSORY'
  return 'FIREARM'
}

export function guessCategory(row: Record<string, string>): string | null {
  const text =
    `${row.category ?? ''} ${row.model ?? ''} ${row.descriptionRaw ?? ''}`.toLowerCase()
  if (/revolver/.test(text)) return 'REVOLVER'
  if (/pistol|pistole|handgun/.test(text)) return 'PISTOL'
  if (
    /shotgun|flinte|bockflinte|schrot|\b12\s*(\/|ga|gauge|bore)/.test(text) ||
    /^(12|16|20|28)\s*\/\s*\d{2}/.test(row.calibreRaw ?? '')
  )
    return 'SHOTGUN'
  if (
    /smg|submachine|maschinenpistole|mp ?40|ppsh|sten|thompson|uzi|mp5/.test(
      text
    )
  )
    return 'SUBMACHINE_GUN'
  if (/machine gun|mg ?\d|maschinengewehr|bren|browning m2|\bbar\b/.test(text))
    return 'MACHINE_GUN'
  if (/carbine|karabiner|\bm1\b/.test(text)) return 'CARBINE'
  if (
    /rifle|gewehr|büchse|sks|mosin|mauser|ak|ar-?15|k98|lee enfield|garand/.test(
      text
    )
  )
    return 'RIFLE'
  return null
}

export function guessFireMode(row: Record<string, string>): string {
  const text =
    `${row.fireMode ?? ''} ${row.descriptionRaw ?? ''} ${row.model ?? ''}`.toLowerCase()
  if (/convert|umgebaut|halbautomat.*(aus|von).*vollautomat/.test(text))
    return 'CONVERTED_FULL_TO_SEMI'
  if (
    /full[- ]?auto|vollautomat|select[- ]?fire|machine gun|maschinen/.test(text)
  )
    return 'FULLY_AUTOMATIC'
  if (/semi|halbautomat|self[- ]?loading|selbstlade/.test(text))
    return 'SEMI_AUTOMATIC'
  return 'NOT_APPLICABLE'
}

export function parseCip(s: string | undefined): number | null {
  if (!s) return null
  if (/^(y|yes|ja|true|1|x|✓)$/i.test(s.trim())) return 1
  if (/^(n|no|nein|false|0)$/i.test(s.trim())) return 0
  return null
}
