import { parsePersonalItemImages } from '@/lib/armory/personal-items'
import type {
  FirearmsForm,
  NonFirearmsForm,
} from '@/app/marketplace/create/schemas'

export type PersonalItemForPrefill = {
  make: string | null
  model: string | null
  calibre: string | null
  serial_number: string | null
  notes: string | null
  image_url?: string | null
  images?: string[] | null
}

function buildTitle(item: PersonalItemForPrefill): string {
  return [item.make, item.model].filter(Boolean).join(' ').trim()
}

function buildDescription(item: PersonalItemForPrefill): string {
  const parts: string[] = []
  if (item.notes?.trim()) parts.push(item.notes.trim())
  if (item.serial_number?.trim()) {
    const serialLine = `Serial: ${item.serial_number.trim()}`
    const notesLower = (item.notes ?? '').toLowerCase()
    if (!notesLower.includes(item.serial_number.trim().toLowerCase())) {
      parts.push(serialLine)
    }
  }
  let description = parts.join('\n\n').trim()
  if (description.length < 10) {
    const fallback = buildTitle(item)
    description = description
      ? `${description}\n\n${fallback}`
      : fallback || 'Personal collection item for sale.'
  }
  return description.slice(0, 2000)
}

export function guessFirearmsCategoryFromNotes(
  notes: string | null
): FirearmsForm['category'] | null {
  const typeMatch = notes
    ?.match(/Type:\s*([^\n]+)/i)?.[1]
    ?.trim()
    .toLowerCase()
  const text = `${typeMatch ?? ''} ${notes ?? ''}`.toLowerCase()
  if (/air\s*pistol|airgun|air gun/.test(text)) return 'airguns'
  if (/revolver/.test(text)) return 'revolvers'
  if (/pistol|handgun/.test(text)) return 'pistols'
  if (/shotgun|flinte/.test(text)) return 'shotguns'
  if (/carbine/.test(text)) return 'carbines'
  if (/crossbow/.test(text)) return 'crossbow'
  if (/black powder|muzzleloader/.test(text)) return 'black_powder'
  if (/replica|deactivated|deact/.test(text)) return 'replica_deactivated'
  if (/rifle|gewehr|büchse|mosin|ak47|ak-47/.test(text)) return 'rifles'
  return null
}

export function buildFirearmsPrefill(
  item: PersonalItemForPrefill,
  allowedCategoryKeys?: string[]
): Partial<FirearmsForm> {
  const guessedCategory = guessFirearmsCategoryFromNotes(item.notes)
  const category =
    guessedCategory && allowedCategoryKeys?.includes(guessedCategory)
      ? guessedCategory
      : undefined

  return {
    ...(category ? { category } : {}),
    calibre: item.calibre?.trim() ?? '',
    title: buildTitle(item) || 'Firearm listing',
    description: buildDescription(item),
    price: 0,
    images: parsePersonalItemImages(item),
  }
}

export function buildNonFirearmsPrefill(
  item: PersonalItemForPrefill
): Partial<NonFirearmsForm> {
  return {
    title: buildTitle(item) || 'Item listing',
    description: buildDescription(item),
    price: 0,
    images: parsePersonalItemImages(item),
  }
}
