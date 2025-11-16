// Image upload constraints
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_FILES = 6
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]
export const DEFAULT_LISTING_IMAGE = '/images/maltaguns-default-img.jpg'

// Firearms categories
export const firearmsCategories = {
  airguns: 'Airguns',
  ammunition: 'Ammunition',
  black_powder: 'Black powder',
  carbines: 'Carbines',
  crossbow: 'Crossbow',
  pistols: 'Pistols',
  replica_deactivated: 'Replica or Deactivated',
  revolvers: 'Revolvers',
  rifles: 'Rifles',
  schedule_1: 'Schedule 1 (automatic)',
  shotguns: 'Shotguns',
} as const

// Helper function to convert URL slug to category key
export function slugToCategoryKey(slug: string): string {
  return slug.replace(/-/g, '_')
}

// Helper function to convert category key to URL slug
export function categoryKeyToSlug(key: string): string {
  return key.replace(/_/g, '-')
}

// Non-firearms categories
export const nonFirearmsCategories = {
  accessories: 'Accessories',
  airsoft: 'Airsoft',
  militaria: 'Militaria',
  reloading: 'Reloading',
} as const

// Non-firearms subcategories
export const nonFirearmsSubcategories = {
  airsoft: {
    airsoft_guns: 'Airsoft Guns',
    bbs_co2: 'BBs & CO2',
    batteries_electronics: 'Batteries & Electronics',
    clothing: 'Clothing',
    other: 'Other',
  },
  reloading: {
    dies: 'Dies',
    other: 'Other',
    presses: 'Presses',
    primers_heads: 'Primers & Heads',
    tools: 'Tools',
    tumblers_media: 'Tumblers & Media',
  },
  militaria: {
    helmets: 'Helmets',
    medals_badges: 'Medals & Badges',
    other: 'Other',
    swords_bayonets_knives: 'Swords, Bayonets & Knives',
    uniforms: 'Uniforms',
  },
  accessories: {
    ammo_boxes: 'Ammo Boxes',
    bipods_stands: 'Bipods & Stands',
    books_manuals: 'Books & Manuals',
    cleaning_maintenance: 'Cleaning & Maintenance',
    grips: 'Grips',
    gun_cases: 'Gun Cases',
    hunting_equipment: 'Hunting Equipment',
    magazines: 'Magazines',
    other: 'Other',
    safes_cabinets: 'Safes & Cabinets',
    safety_equipment: 'Safety Equipment',
    scopes_sights_optics: 'Scopes, Sights & Optics',
    slings_holsters: 'Slings & Holsters',
  },
} as const
