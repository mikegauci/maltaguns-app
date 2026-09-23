const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'

async function claude(
  system: string,
  user: string,
  maxTokens = 1500
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok)
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as {
    content: { type: string; text?: string }[]
  }
  return json.content.find(c => c.type === 'text')?.text ?? null
}

export function aiConfigured() {
  return !!process.env.ANTHROPIC_API_KEY
}

export async function translateToEnglish(text: string): Promise<string | null> {
  const key = process.env.DEEPL_API_KEY
  if (key) {
    const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com'
    const res = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], target_lang: 'EN-GB' }),
    })
    if (res.ok) {
      const j = (await res.json()) as { translations: { text: string }[] }
      return j.translations[0]?.text ?? null
    }
  }
  const out = await claude(
    "You translate German firearms-marketplace listing descriptions into clear English for a licensed dealer's records. Keep every fact (condition, included accessories, calibre, markings, defects). Output only the translation.",
    text,
    2000
  )
  return out
}

export const CORRECTABLE_FIELDS = [
  'make',
  'model',
  'category',
  'typeDescription',
  'serialNumber',
  'calibreRaw',
  'countryOfManufacture',
  'yearOfManufacture',
  'capacity',
  'loading',
  'fireMode',
  'barrelType',
  'hammerType',
  'sightsType',
  'cipProof',
  'otherFeatures',
  'acquisitionPrice',
  'egunDomesticShippingFee',
  'salePrice',
  'clientHandlingFee',
  'originalSeller',
  'buyerLicenceType',
  'buyerLicenceNumber',
  'notes',
] as const
export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number]

const ALIASES: Record<string, CorrectableField> = {
  make: 'make',
  manufacturer: 'make',
  brand: 'make',
  model: 'model',
  type: 'category',
  category: 'category',
  description: 'typeDescription',
  serial: 'serialNumber',
  'serial number': 'serialNumber',
  'serial no': 'serialNumber',
  sn: 'serialNumber',
  calibre: 'calibreRaw',
  caliber: 'calibreRaw',
  cal: 'calibreRaw',
  country: 'countryOfManufacture',
  'country of manufacture': 'countryOfManufacture',
  origin: 'countryOfManufacture',
  year: 'yearOfManufacture',
  'year of manufacture': 'yearOfManufacture',
  capacity: 'capacity',
  'ammo capacity': 'capacity',
  'magazine capacity': 'capacity',
  loading: 'loading',
  'fire mode': 'fireMode',
  action: 'fireMode',
  barrel: 'barrelType',
  hammer: 'hammerType',
  sights: 'sightsType',
  sight: 'sightsType',
  cip: 'cipProof',
  'cip proof': 'cipProof',
  features: 'otherFeatures',
  'other features': 'otherFeatures',
  price: 'acquisitionPrice',
  'acquisition price': 'acquisitionPrice',
  cost: 'acquisitionPrice',
  'shipping fee': 'egunDomesticShippingFee',
  'egun shipping': 'egunDomesticShippingFee',
  'sale price': 'salePrice',
  'handling fee': 'clientHandlingFee',
  seller: 'originalSeller',
  'licence type': 'buyerLicenceType',
  'license type': 'buyerLicenceType',
  'licence number': 'buyerLicenceNumber',
  'license number': 'buyerLicenceNumber',
  notes: 'notes',
  note: 'notes',
}

export type Correction = { field: CorrectableField; value: string | null }

export function normaliseValue(
  field: CorrectableField,
  value: string | null
): string | null {
  if (value === null) return null
  const v = value.trim()
  switch (field) {
    case 'sightsType': {
      const found = ['OPEN', 'TELESCOPIC', 'ADJUSTABLE', 'FIXED'].filter(s =>
        new RegExp(s, 'i').test(v)
      )
      return found.length ? found.join(',') : v.toUpperCase()
    }
    case 'category': {
      const u = v.toUpperCase().replace(/[\s-]+/g, '_')
      if (/SMG|SUB_?MACHINE/.test(u)) return 'SUBMACHINE_GUN'
      if (/MACHINE_GUN|^MG$/.test(u)) return 'MACHINE_GUN'
      return u
    }
    case 'loading': {
      const u = v.toUpperCase()
      if (/AUTO|MAG/.test(u)) return 'AUTOMATIC'
      if (/BOLT|LEVER|PUMP|MANUAL/.test(u)) return 'MANUAL'
      if (/BREAK/.test(u)) return 'BREAK_ACTION'
      if (/SINGLE/.test(u)) return 'SINGLE_SHOT'
      if (/REVOLVER|CYLINDER/.test(u)) return 'REVOLVER'
      return u.replace(/[\s-]+/g, '_')
    }
    case 'fireMode': {
      const u = v.toUpperCase()
      if (/CONVERT/.test(u)) return 'CONVERTED_FULL_TO_SEMI'
      if (/FULL/.test(u)) return 'FULLY_AUTOMATIC'
      if (/SEMI/.test(u)) return 'SEMI_AUTOMATIC'
      if (/MANUAL|N\/?A|NOT/.test(u)) return 'NOT_APPLICABLE'
      return u.replace(/[\s-]+/g, '_')
    }
    case 'cipProof':
      return /^(y|yes|ja|true|1)$/i.test(v)
        ? '1'
        : /^(n|no|nein|false|0)$/i.test(v)
          ? '0'
          : v
    default:
      return v
  }
}

export function parseCorrectionsLocally(text: string): {
  corrections: Correction[]
  unparsed: string[]
} {
  const corrections: Correction[] = []
  const unparsed: string[] = []
  const aliasKeys = Object.keys(ALIASES).sort((a, b) => b.length - a.length)
  const startsWithField = (s: string) =>
    aliasKeys.some(k =>
      new RegExp(
        `^(?:set|change|update|make)?\\s*(?:the\\s+)?${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i'
      ).test(s.trim())
    )
  const parts: string[] = []
  for (const seg of text.split(/\n|;/)) {
    const pieces = seg.split(',')
    let cur = ''
    for (const piece of pieces) {
      if (cur && startsWithField(piece)) {
        parts.push(cur.trim())
        cur = piece
      } else cur = cur ? `${cur},${piece}` : piece
    }
    if (cur.trim()) parts.push(cur.trim())
  }
  for (const p of parts) {
    const body = p
      .replace(
        /^(?:please\s+)?(?:set|change|update|make|correct)\s+(?:the\s+)?/i,
        ''
      )
      .trim()
    const lower = body.toLowerCase()
    let field: CorrectableField | undefined
    let rest = ''
    for (const k of aliasKeys) {
      if (
        lower === k ||
        lower.startsWith(k + ' ') ||
        lower.startsWith(k + ':') ||
        lower.startsWith(k + '=')
      ) {
        field = ALIASES[k]
        rest = body.slice(k.length)
        break
      }
    }
    if (!field) {
      const direct = (CORRECTABLE_FIELDS as readonly string[]).find(f =>
        lower.startsWith(f.toLowerCase())
      )
      if (direct) {
        field = direct as CorrectableField
        rest = body.slice(direct.length)
      }
    }
    if (!field) {
      unparsed.push(p)
      continue
    }
    let value: string | null = rest
      .replace(/^\s*(?:to|=|:|is|should be|->|→)?\s*/i, '')
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!value || /^(none|null|empty|clear|blank|-)$/i.test(value)) value = null
    corrections.push({ field, value: normaliseValue(field, value) })
  }
  return { corrections, unparsed }
}

export async function parseCorrections(
  text: string,
  current: Record<string, unknown>
): Promise<{
  corrections: Correction[]
  unparsed: string[]
  via: 'ai' | 'local'
}> {
  if (!aiConfigured()) return { ...parseCorrectionsLocally(text), via: 'local' }
  const system = `You convert a firearms dealer's free-text correction into field updates for an inventory record.
Allowed fields: ${CORRECTABLE_FIELDS.join(', ')}.
Field conventions: category ∈ PISTOL|REVOLVER|RIFLE|CARBINE|SHOTGUN|SUBMACHINE_GUN|MACHINE_GUN|OTHER; loading ∈ AUTOMATIC|MANUAL|BREAK_ACTION|SINGLE_SHOT|REVOLVER; fireMode ∈ SEMI_AUTOMATIC|FULLY_AUTOMATIC|CONVERTED_FULL_TO_SEMI|NOT_APPLICABLE; sightsType is a comma list of OPEN,TELESCOPIC,ADJUSTABLE,FIXED; cipProof is "1" or "0"; prices are plain numbers.
Respond with JSON only: {"corrections":[{"field":"...","value":"..."|null}],"unparsed":["..."]}. Put anything you can't map safely into "unparsed" rather than guessing.`
  const user = `Current record:\n${JSON.stringify(current, null, 0)}\n\nDealer's instruction:\n${text}`
  const out = await claude(system, user, 800)
  if (!out) return { ...parseCorrectionsLocally(text), via: 'local' }
  const json = out.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return { ...parseCorrectionsLocally(text), via: 'local' }
  try {
    const parsed = JSON.parse(json) as {
      corrections?: Correction[]
      unparsed?: string[]
    }
    const corrections = (parsed.corrections ?? []).filter(c =>
      (CORRECTABLE_FIELDS as readonly string[]).includes(c.field)
    )
    return { corrections, unparsed: parsed.unparsed ?? [], via: 'ai' }
  } catch {
    return { ...parseCorrectionsLocally(text), via: 'local' }
  }
}

export type RowItemType = 'FIREARM' | 'REGULATED_COMPONENT' | 'ACCESSORY'
export type RowTypeGuess = { itemType: RowItemType; confidence: 'high' | 'low' }

const ROW_TYPES: readonly RowItemType[] = [
  'FIREARM',
  'REGULATED_COMPONENT',
  'ACCESSORY',
]

export async function classifyRowTypes(
  rows: { idx: number; text: string }[]
): Promise<{
  guesses: Record<number, RowTypeGuess>
  via: 'ai' | 'local'
  failedRows: number
}> {
  if (!aiConfigured() || rows.length === 0)
    return { guesses: {}, via: 'local', failedRows: 0 }
  const system = `You classify rows from a firearms dealer's inventory spreadsheet, one item per row, from its make/model/description text.
- FIREARM: a complete gun (pistol, revolver, rifle, shotgun, etc).
- REGULATED_COMPONENT: a serialised essential part sold on its own — barrel, receiver/frame, slide, bolt, cylinder.
- ACCESSORY: everything else — magazine, sling, holster, scope/optic, case, cleaning kit, spent brass, grip/stock, bipod, tool, ammunition.
A wrong FIREARM classification has real legal consequences for the dealer, so if a row is genuinely ambiguous, still give your best guess but mark it "low" confidence rather than "high" — do not default to FIREARM just because you're unsure.
Respond with JSON only: {"rows":[{"idx":<number>,"itemType":"FIREARM"|"REGULATED_COMPONENT"|"ACCESSORY","confidence":"high"|"low"}]}`
  const guesses: Record<number, RowTypeGuess> = {}
  let failedRows = 0
  const CHUNK = 80
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const user = chunk.map(r => `${r.idx}: ${r.text || '(no text)'}`).join('\n')
    let out: string | null = null
    let chunkFailed = false
    try {
      out = await claude(system, user, 4000)
    } catch {
      chunkFailed = true
    }
    if (!chunkFailed) {
      if (!out) chunkFailed = true
      else {
        const json = out.match(/\{[\s\S]*\}/)?.[0]
        if (!json) chunkFailed = true
        else {
          try {
            const parsed = JSON.parse(json) as {
              rows?: { idx: number; itemType: string; confidence: string }[]
            }
            if (!parsed.rows?.length) chunkFailed = true
            else {
              for (const r of parsed.rows) {
                if (!ROW_TYPES.includes(r.itemType as RowItemType)) continue
                guesses[r.idx] = {
                  itemType: r.itemType as RowItemType,
                  confidence: r.confidence === 'high' ? 'high' : 'low',
                }
              }
            }
          } catch {
            chunkFailed = true
          }
        }
      }
    }
    if (chunkFailed) failedRows += chunk.length
  }
  return {
    guesses,
    via: Object.keys(guesses).length ? 'ai' : 'local',
    failedRows,
  }
}
