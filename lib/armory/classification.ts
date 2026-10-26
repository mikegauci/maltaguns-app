// Firearm classification rule engine.
//
// Everything a dealer would otherwise work out by hand when filling in the
// Prior Consent annex and the Weapons Office transfer proforma: calibre
// normalisation, Malta Arms Act schedule (in both notations the two documents
// use), EU Directive category, and the compliance flags that should stop a
// print or force a second look.
//
// The rules are deliberately data-driven and commented so a dealer (or the
// admin) can extend them without touching the rest of the app. Every output
// is a *suggestion*: the item keeps `scheduleOverridden` / `scheduleOverrideReason`
// for the cases the engine can't know about.

export type ItemType = 'FIREARM' | 'REGULATED_COMPONENT' | 'ACCESSORY'
export type FireMode =
  | 'SEMI_AUTOMATIC'
  | 'FULLY_AUTOMATIC'
  | 'CONVERTED_FULL_TO_SEMI'
  | 'NOT_APPLICABLE'
export type FirearmCategory =
  | 'PISTOL'
  | 'REVOLVER'
  | 'RIFLE'
  | 'CARBINE'
  | 'SHOTGUN'
  | 'SUBMACHINE_GUN'
  | 'MACHINE_GUN'
  | 'OTHER'
export type Loading =
  | 'AUTOMATIC'
  | 'MANUAL'
  | 'BREAK_ACTION'
  | 'SINGLE_SHOT'
  | 'REVOLVER'
  | 'UNKNOWN'

export const FIREARM_CATEGORIES: {
  value: FirearmCategory
  label: string
  long: boolean
}[] = [
  { value: 'PISTOL', label: 'Pistol', long: false },
  { value: 'REVOLVER', label: 'Revolver', long: false },
  { value: 'RIFLE', label: 'Rifle', long: true },
  { value: 'CARBINE', label: 'Carbine', long: true },
  { value: 'SHOTGUN', label: 'Shotgun', long: true },
  { value: 'SUBMACHINE_GUN', label: 'Submachine gun', long: false },
  { value: 'MACHINE_GUN', label: 'Machine gun', long: true },
  { value: 'OTHER', label: 'Other', long: true },
]

// "Loading" on the proforma describes how the gun feeds, not how it fires:
// a pistol with a detachable magazine is an *automatic* feed even though it
// fires semi-automatically. Fire mode is a separate field.
export const LOADING_OPTIONS: { value: Loading; label: string }[] = [
  { value: 'AUTOMATIC', label: 'Automatic (magazine-fed)' },
  { value: 'MANUAL', label: 'Manual (bolt / lever / pump)' },
  { value: 'BREAK_ACTION', label: 'Break action' },
  { value: 'SINGLE_SHOT', label: 'Single shot' },
  { value: 'REVOLVER', label: 'Revolver (cylinder)' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

export const FIRE_MODES: { value: FireMode; label: string }[] = [
  { value: 'SEMI_AUTOMATIC', label: 'Semi-automatic' },
  { value: 'FULLY_AUTOMATIC', label: 'Fully automatic' },
  { value: 'CONVERTED_FULL_TO_SEMI', label: 'Converted full-auto → semi-auto' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable (manual / single shot)' },
]

// The four sight types on the Weapons Office transfer proforma. Codes are
// stable (stored on the item); the label text/order below matches the
// dealer's own redesigned proforma layout (src/app/print/proforma/page.tsx).
export const SIGHT_OPTIONS = [
  'OPEN',
  'TELESCOPIC',
  'FLAT',
  'ADJUSTABLE_REAR',
] as const
export type SightType = (typeof SIGHT_OPTIONS)[number]
export const SIGHT_LABELS: Record<SightType, string> = {
  OPEN: 'Open sights',
  FLAT: 'Flat sights',
  ADJUSTABLE_REAR: 'Adjustable Sights',
  TELESCOPIC: 'Telescopic sights',
}
// Print order for the redesigned form (Open, Flat, Adjustable, Telescopic) —
// differs from the array above only in display order, not meaning.
export const SIGHT_PRINT_ORDER: SightType[] = [
  'OPEN',
  'FLAT',
  'ADJUSTABLE_REAR',
  'TELESCOPIC',
]

// The proforma's "Loading" checkbox group (single choice — one box ticked).
// Separate from the `Loading` type above, which is a coarser internal
// classification used for EU-category logic and is not printed verbatim.
export const PROFORMA_LOADING_OPTIONS = [
  { value: 'AUTOMATIC', label: 'Automatic' },
  { value: 'GATE_LOADING', label: 'Gate loading' },
  { value: 'BREAKING_BARREL', label: 'Breaking Barrel' },
  { value: 'SWING_OUT_CYLINDER', label: 'Swing Out Cylinder' },
  { value: 'PUMP_ACTION', label: 'Pump Action' },
  { value: 'BOLT_ACTION', label: 'Bolt Action' },
  { value: 'WITH_EJECTOR_EXTRACTOR', label: 'With Ejector/Extractor' },
] as const

// The proforma's "Barrel/Hammer" checkbox group — also a single choice
// sharing one checkbox column on the real form.
export const PROFORMA_BARREL_HAMMER_OPTIONS = [
  { value: 'SINGLE_BARREL', label: 'Single Barrel' },
  { value: 'SIDE_BY_SIDE', label: 'Side by Side' },
  { value: 'OVER_AND_UNDER', label: 'Over and Under' },
  { value: 'BARRELS', label: 'Barrel/s' },
  { value: 'HAMMERLESS', label: 'Hammerless' },
  { value: 'WITH_HAMMERS', label: 'With Hammer/s' },
] as const

// The proforma's "Classification of Firearm" checkboxes — the exact ~18
// numbered line items across the three Schedules, as printed on the form.
// The coarse `classify()` schedule bucket (SCHEDULE_MAP above) only tells
// us which of the three Schedules applies; which specific numbered item
// within it is a compliance-critical judgement call the dealer must
// confirm explicitly (see suggestScheduleLineItem below — it proposes,
// never decides).
export const SCHEDULE_LINE_ITEMS = [
  {
    code: 'SCH1_ITEM2',
    schedule: 'I' as const,
    label: 'Item 2 – Automatic Firearms (Antique/Artistic/Historical/Rare)',
  },
  {
    code: 'SCH1_ITEM3',
    schedule: 'I' as const,
    label:
      'Item 3 – Auto and subsequently converted to Semi Auto (Antique/Artistic/Historical/Rare)',
  },
  {
    code: 'SCH1_ITEM15A',
    schedule: 'I' as const,
    label:
      'Item 15a – Short firearms which allow the firing of more than 21 rounds without reloading',
  },
  {
    code: 'SCH1_ITEM15B',
    schedule: 'I' as const,
    label:
      'Item 15b – Long firearms which allow the firing of more than 11 rounds without reloading',
  },
  {
    code: 'SCH2_S1_ITEM1',
    schedule: 'II' as const,
    label: 'Sch 2 Sect 1 Item 1 – Semi Auto / Repeating Short Firearms',
  },
  {
    code: 'SCH2_S1_ITEM2',
    schedule: 'II' as const,
    label: 'Sch 2 Sect 1 Item 2 – Rifle / Carbine / Combination Gun',
  },
  {
    code: 'SCH2_S1_ITEM3',
    schedule: 'II' as const,
    label: 'Sch 2 Sect 1 Item 3 – Single shot Revolver / Pistol',
  },
  {
    code: 'SCH2_S1_ITEM4',
    schedule: 'II' as const,
    label: 'Sch 2 Sect 1 Item 4 – Single shot Rifle',
  },
  {
    code: 'SCH2_S1_ITEM5',
    schedule: 'II' as const,
    label: 'Sch 2 Sect 1 Item 5 – Shotgun',
  },
  {
    code: 'SCH2_S1_ITEM6',
    schedule: 'II' as const,
    label:
      'Sch 2 Sect 1 Item 6 – Muzzle loading firearm post 1900, designed to be loaded with ammunition as defined in the act',
  },
  {
    code: 'SCH2_S1_ITEM7',
    schedule: 'II' as const,
    label:
      'Sch 2 Sect 1 Item 7 – Firearms manufactured to exclusively fire blank shots',
  },
  {
    code: 'SCH2_S1_ITEM8',
    schedule: 'II' as const,
    label: 'Sch 2 Sect 1 Item 8 – Air guns (Air Rifle / Air Pistol)',
  },
  {
    code: 'SCH2_S1_ITEM9',
    schedule: 'II' as const,
    label: 'Sch 2 Sect 1 Item 9 – Essential Component of the firearm',
  },
  {
    code: 'SCH2_S2_ITEM1',
    schedule: 'II' as const,
    label:
      'Sch 2 Sect 2 Item 1 – Crossbows / Bows (peak pulling weight over 60 pounds)',
  },
  {
    code: 'SCH3_S1_ITEM1',
    schedule: 'III' as const,
    label: 'Sch 3 Sect 1 Item 1 – Firearms manufactured prior to 1900',
  },
  {
    code: 'SCH3_S1_ITEM2',
    schedule: 'III' as const,
    label:
      'Sch 3 Sect 1 Item 2 – Replicas of pre 1900 single shot muzzle loading firearms',
  },
  {
    code: 'SCH3_S1_ITEM3',
    schedule: 'III' as const,
    label: 'Sch 3 Sect 1 Item 3 – De-activated Firearms',
  },
  {
    code: 'SCH3_S1_ITEM4',
    schedule: 'III' as const,
    label:
      'Sch 3 Sect 1 Item 4 – Firearm designed for alarm, signalling or life-saving',
  },
] as const
export type ScheduleLineItemCode = (typeof SCHEDULE_LINE_ITEMS)[number]['code']

/** A starting suggestion only — the proforma print page requires the dealer
 *  to have explicitly confirmed `scheduleLineItemCode` on the item; this is
 *  never applied automatically. */
export function suggestScheduleLineItem(
  c: ClassificationResult,
  category?: FirearmCategory | string | null,
  deactivated?: boolean
): ScheduleLineItemCode | null {
  if (deactivated) return 'SCH3_S1_ITEM3'
  if (c.scheduleCode === 'SCHEDULE_I_ITEM_2') return 'SCH1_ITEM2'
  if (c.scheduleCode === 'SCHEDULE_I_PROHIBITED') return null // not transferable — no suggestion
  if (c.scheduleCode === 'SCHEDULE_III') return null
  if (c.scheduleCode === 'SCHEDULE_II') {
    switch (category) {
      case 'PISTOL':
      case 'REVOLVER':
        return 'SCH2_S1_ITEM1'
      case 'RIFLE':
      case 'CARBINE':
        return 'SCH2_S1_ITEM2'
      case 'SHOTGUN':
        return 'SCH2_S1_ITEM5'
      default:
        return null
    }
  }
  return null
}

// The proforma's "Licence Type or Purpose of Acquisition" declaration —
// three checkbox columns on the dealer's redesigned form. Codes are stable
// (stored on the item); `col` is which column the redesigned layout puts
// it in (src/app/print/proforma/page.tsx).
export const PURCHASE_PURPOSE_OPTIONS = [
  { code: 'TSA', col: 1 as const, label: 'Target Shooter A' },
  { code: 'TSA_SPECIAL', col: 1 as const, label: 'Target Shooter A SPECIAL' },
  { code: 'TSB', col: 1 as const, label: 'Target Shooter B' },
  { code: 'COLLECTOR_A', col: 2 as const, label: 'Collector A' },
  {
    code: 'COLLECTOR_A_SPECIAL',
    col: 2 as const,
    label: 'Collector A SPECIAL',
  },
  {
    code: 'INHERITANCE_COLLECTOR_B',
    col: 2 as const,
    label: 'Collector B (inheritance)',
  },
  { code: 'HUNTING', col: 3 as const, label: 'Hunting Purposes' },
  { code: 'SCHEDULE_III_PURPOSE', col: 3 as const, label: 'Schedule III' },
  { code: 'DEALER_STOCK', col: 3 as const, label: 'Dealer Stock Register' },
] as const
export type PurchasePurposeCode =
  (typeof PURCHASE_PURPOSE_OPTIONS)[number]['code']

export const REGULATED_COMPONENT_TYPES = [
  'Barrel',
  'Frame / receiver',
  'Upper receiver',
  'Slide',
  'Cylinder',
  'Bolt / breech block',
  'Other essential component',
]

export const ACCESSORY_TYPES = [
  'Magazine',
  'Optic / scope',
  'Sling',
  'Holster',
  'Case / bag',
  'Cleaning kit / tool',
  'Spent cases (reloading)',
  'Stock / grip / furniture',
  'Bipod / mount',
  'Other accessory',
]

// ---------------------------------------------------------------------------
// Calibre normalisation
// ---------------------------------------------------------------------------

type CalibreRule = {
  test: RegExp
  display: string | ((m: RegExpMatchArray) => string)
  gauge?: string
  note?: string
}

// Order matters: first match wins. Everything is matched against a lower-cased,
// whitespace-collapsed version of the raw string with dots/commas normalised.
const CALIBRE_RULES: CalibreRule[] = [
  // Shotgun gauges. "12/70", "12/76", "12/73", "12ga", "12 bore", "cal. 12" → "12 gauge"
  {
    test: /^(12|16|20|28|32)\s*(\/\s*\d{2,3})?\s*(ga|gauge|bore|g)?$/,
    display: m => `${m[1]} gauge`,
    gauge: '$1',
  },
  { test: /^(\.?410)\b/, display: '.410 gauge', gauge: '.410' },
  {
    test: /^cal\.?\s*(12|16|20|28)\b/,
    display: m => `${m[1]} gauge`,
    gauge: '$1',
  },

  // 9mm family → "9mm" (9x19, 9x21, 9mm Luger/Para/Parabellum). 9x18 Makarov stays separate.
  { test: /^9\s*(x|×)\s*(19|21)\b/, display: '9mm' },
  { test: /^9\s*mm\s*(luger|para|parabellum)?$/, display: '9mm' },
  { test: /^9\s*(x|×)\s*18\b/, display: '9x18 Makarov' },

  // .45 ACP
  { test: /^\.?45\s*(acp|auto)?$/, display: '.45 ACP' },

  // .22 — must be explicit. Bare ".22" is ambiguous and gets flagged.
  { test: /^\.?22\s*(lr|l\.r\.|long rifle)$/, display: '.22 LR' },
  { test: /^\.?22\s*(short|kurz|k)$/, display: '.22 Short' },
  { test: /^\.?22\s*(wmr|magnum|mag)$/, display: '.22 WMR' },
  { test: /^\.?22\s*(hornet)$/, display: '.22 Hornet' },
  {
    test: /^\.?22$/,
    display: '.22 (specify LR or Short)',
    note: "Calibre '.22' is ambiguous — write .22 LR or .22 Short",
  },

  // 7.62 family — kept separate on purpose, written in full.
  { test: /^7[.,]62\s*(x|×)\s*39\b/, display: '7.62x39' },
  { test: /^7[.,]62\s*(x|×)\s*54\s*r?\b/, display: '7.62x54R' },
  { test: /^7[.,]62\s*(x|×)\s*25\b/, display: '7.62x25 Tokarev' },
  { test: /^7[.,]62\s*(x|×)\s*51\b/, display: '7.62x51 NATO' },
  { test: /^7[.,]62\s*(x|×)\s*38\s*r?\b/, display: '7.62x38R Nagant' },
  { test: /^\.?308\s*(win|winchester)?$/, display: '.308 Winchester' },

  // .223 / 5.56
  { test: /^\.?223\s*(rem|remington)?$/, display: '.223 Remington' },
  { test: /^5[.,]56\s*(x|×)?\s*(45)?\s*(nato)?$/, display: '5.56x45 NATO' },

  // Common others (pass-through with tidy display)
  {
    test: /^7[.,]92\s*(x|×)\s*57\b|^8\s*(x|×)\s*57\s*(is|js|i|j)?\b/,
    display: '7.92x57 Mauser',
  },
  { test: /^\.?30[- ]?06\b/, display: '.30-06 Springfield' },
  { test: /^\.?30\s*carbine$/, display: '.30 Carbine' },
  { test: /^\.?38\s*(spl|special)$/, display: '.38 Special' },
  { test: /^\.?357\s*(mag|magnum)?$/, display: '.357 Magnum' },
  { test: /^\.?40\s*(s&w|sw)?$/, display: '.40 S&W' },
  { test: /^\.?380\s*(acp|auto)?$|^9\s*(x|×)\s*17\b/, display: '.380 ACP' },
  {
    test: /^7[.,]65\s*(x|×)?\s*(17)?\s*(browning)?$|^\.?32\s*acp$/,
    display: '7.65 Browning (.32 ACP)',
  },
  { test: /^6[.,]5\s*(x|×)\s*55\b/, display: '6.5x55 Swedish' },
  { test: /^\.?303\s*(brit|british)?$/, display: '.303 British' },
  { test: /^\.?44\s*(mag|magnum)$/, display: '.44 Magnum' },
  { test: /^4[.,]5\s*mm|^\.?177\b/, display: '4.5mm (.177)' },
]

export type CalibreResult = {
  raw: string
  display: string
  gauge: string | null
  isShotgun: boolean
  matched: boolean
  note: string | null
}

export function normaliseCalibre(
  rawInput: string | null | undefined
): CalibreResult {
  const raw = (rawInput ?? '').trim()
  if (!raw)
    return {
      raw,
      display: '',
      gauge: null,
      isShotgun: false,
      matched: false,
      note: null,
    }

  const s = raw
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/^kal\.?\s*|^cal\.?\s*(?=\d)/, '')
    .replace(/\bmm\b/g, 'mm')
    .trim()

  for (const rule of CALIBRE_RULES) {
    const m = s.match(rule.test)
    if (m) {
      const display =
        typeof rule.display === 'function' ? rule.display(m) : rule.display
      const gauge = rule.gauge ? rule.gauge.replace('$1', m[1] ?? '') : null
      return {
        raw,
        display,
        gauge,
        isShotgun: !!gauge,
        matched: true,
        note: rule.note ?? null,
      }
    }
  }
  // Unknown: tidy the raw value but flag it so the dealer checks it once.
  const tidy = raw.replace(/\s+/g, ' ').trim()
  return {
    raw,
    display: tidy,
    gauge: null,
    isShotgun: false,
    matched: false,
    note: `Calibre "${tidy}" has no normalisation rule — check spelling before printing`,
  }
}

// ---------------------------------------------------------------------------
// Malta Arms Act schedule + EU category
// ---------------------------------------------------------------------------

export type ScheduleCode =
  'SCHEDULE_I_ITEM_2' | 'SCHEDULE_I_PROHIBITED' | 'SCHEDULE_II' | 'SCHEDULE_III'

// The two documents describe the same classification in two notations:
// the transfer proforma uses the Arms Act wording ("Schedule I, Item 2"),
// the import (Prior Consent) paperwork uses the short police notation
// ("Schedule 1A", "Schedule 2B"). One table keeps them in step.
export const SCHEDULE_MAP: Record<
  ScheduleCode,
  { proforma: string; importDoc: string; description: string; licence: string }
> = {
  SCHEDULE_I_ITEM_2: {
    proforma: 'Schedule I, Item 2',
    importDoc: 'Schedule 1A',
    description:
      'Fully automatic firearm manufactured before 1 January 1946 (antique under art. 2 of the Arms Act)',
    licence: "Collector's licence (art. 11)",
  },
  SCHEDULE_I_PROHIBITED: {
    proforma: 'Schedule I, Part I',
    importDoc: 'Schedule 1',
    description:
      'Prohibited weapon — fully automatic firearm manufactured 1946 or later',
    licence: 'Not transferable to a civilian licence',
  },
  SCHEDULE_II: {
    proforma: 'Schedule II',
    importDoc: 'Schedule 2B',
    description:
      'Licensable firearm (target shooter / collector / hunting as applicable)',
    licence: 'Target shooter, collector or hunting licence as applicable',
  },
  SCHEDULE_III: {
    proforma: 'Schedule III',
    importDoc: 'Schedule 3',
    description: 'Air weapons and other Schedule III items',
    licence: 'As applicable',
  },
}

export type ClassificationInput = {
  itemType: ItemType
  category?: FirearmCategory | string | null
  fireMode?: FireMode | string | null
  loading?: Loading | string | null
  yearOfManufacture?: string | number | null
  calibreRaw?: string | null
  serialNumber?: string | null
  deactivated?: boolean | number | null
  typeDescription?: string | null
  make?: string | null
  model?: string | null
}

export type ClassificationResult = {
  calibre: CalibreResult
  scheduleCode: ScheduleCode | null
  scheduleProforma: string | null
  scheduleImportDoc: string | null
  euCategory: string | null
  warnings: string[] // stop-and-check items shown in the UI and on printed documents
  blockers: string[] // things that must be fixed before a document can be auto-filled
  isAntique: boolean
}

const PROHIBITED_ACCESSORY =
  /silencer|suppressor|sound moderator|moderator|schalld[aä]mpfer|schallgedämpft/i

function parseYear(y: string | number | null | undefined): number | null {
  if (y === null || y === undefined || y === '') return null
  const m = String(y).match(/(1[6-9]\d\d|20\d\d)/)
  return m ? parseInt(m[1], 10) : null
}

export function classify(input: ClassificationInput): ClassificationResult {
  const warnings: string[] = []
  const blockers: string[] = []
  const calibre = normaliseCalibre(input.calibreRaw)
  if (calibre.note) warnings.push(calibre.note)

  if (input.itemType === 'ACCESSORY') {
    const text = `${input.typeDescription ?? ''} ${input.model ?? ''} ${input.make ?? ''}`
    if (PROHIBITED_ACCESSORY.test(text)) {
      blockers.push(
        'Silencers / sound moderators are prohibited items under the Arms Act and cannot be added.'
      )
    }
    return {
      calibre,
      scheduleCode: null,
      scheduleProforma: null,
      scheduleImportDoc: null,
      euCategory: null,
      warnings,
      blockers,
      isAntique: false,
    }
  }

  if (input.itemType === 'REGULATED_COMPONENT') {
    // Essential components need the import licence but do not get a proforma
    // schedule of their own; they are listed on the Prior Consent annex.
    if (!input.serialNumber)
      warnings.push(
        'Essential components should carry a serial number where the manufacturer applies one.'
      )
    return {
      calibre,
      scheduleCode: null,
      scheduleProforma: null,
      scheduleImportDoc: 'Essential component',
      euCategory: null,
      warnings,
      blockers,
      isAntique: false,
    }
  }

  // FIREARM ----------------------------------------------------------------
  const year = parseYear(input.yearOfManufacture)
  const fireMode = (input.fireMode ?? 'NOT_APPLICABLE') as FireMode
  const category = (input.category ?? 'OTHER') as FirearmCategory
  const deactivated = !!input.deactivated
  const isLong =
    FIREARM_CATEGORIES.find(c => c.value === category)?.long ?? true

  if (!input.serialNumber || !input.serialNumber.trim()) {
    blockers.push(
      'Serial number is required for every firearm (firearms with missing or defaced markings cannot be transferred).'
    )
  }
  if (!input.make) blockers.push('Make is required.')
  if (!calibre.display) blockers.push('Calibre is required.')
  if (year === null)
    warnings.push(
      'Year of manufacture is missing — the proforma has a field for it and the schedule depends on it for automatic firearms.'
    )

  let scheduleCode: ScheduleCode
  let isAntique = false

  if (fireMode === 'FULLY_AUTOMATIC') {
    if (year !== null && year < 1946) {
      scheduleCode = 'SCHEDULE_I_ITEM_2'
      isAntique = true
    } else if (year === null) {
      scheduleCode = 'SCHEDULE_I_ITEM_2'
      warnings.push(
        'Fully automatic with no year: classified as Schedule I Item 2 on the assumption it is pre-1946 — confirm the year.'
      )
    } else {
      scheduleCode = 'SCHEDULE_I_PROHIBITED'
      blockers.push(
        'Fully automatic firearm manufactured 1946 or later is a prohibited weapon (Schedule I, Part I).'
      )
    }
  } else if (fireMode === 'CONVERTED_FULL_TO_SEMI') {
    scheduleCode = 'SCHEDULE_II'
    warnings.push(
      'Converted from fully automatic — the Weapons Office may require Ballistics Unit inspection before approving the transfer.'
    )
  } else {
    scheduleCode = 'SCHEDULE_II' // 90% case: shotguns, rifles, pistols, semi-autos
  }

  if (calibre.isShotgun && category !== 'SHOTGUN') {
    warnings.push(
      `Calibre is a shotgun gauge (${calibre.display}) but the type is ${category.toLowerCase()} — check the type.`
    )
  }

  // EU Directive (EU) 2021/555 Annex I category — used on the Prior Consent annex.
  let euCategory: string
  if (deactivated) euCategory = 'C6'
  else if (fireMode === 'FULLY_AUTOMATIC') euCategory = 'A2'
  else if (fireMode === 'CONVERTED_FULL_TO_SEMI') euCategory = 'A6'
  else if (fireMode === 'SEMI_AUTOMATIC') euCategory = isLong ? 'B' : 'B'
  else if (!isLong)
    euCategory = 'B' // repeating / single-shot short firearms
  else if (
    calibre.isShotgun ||
    input.loading === 'MANUAL' ||
    input.loading === 'BREAK_ACTION' ||
    input.loading === 'SINGLE_SHOT'
  )
    euCategory = 'C'
  else euCategory = 'C'

  if (deactivated) {
    warnings.push(
      'Deactivated firearm — a deactivation certificate compliant with Regulation (EU) 2015/2403 must accompany it.'
    )
  }

  const map = SCHEDULE_MAP[scheduleCode]
  return {
    calibre,
    scheduleCode,
    scheduleProforma: map.proforma,
    scheduleImportDoc: map.importDoc,
    euCategory,
    warnings,
    blockers,
    isAntique,
  }
}

// Handling fee default (dealer's flexible €100 rifle / €60 pistol convention).
export function defaultHandlingFee(
  category: string | null | undefined,
  rifleFee: number | null | undefined,
  pistolFee: number | null | undefined
): number | null {
  const isLong = FIREARM_CATEGORIES.find(c => c.value === category)?.long
  if (isLong === undefined) return null
  return isLong ? (rifleFee ?? 100) : (pistolFee ?? 60)
}
