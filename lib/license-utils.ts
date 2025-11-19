/**
 * License Types and Category Mappings
 * This file defines which license types allow users to create listings for which categories
 */

export interface LicenseTypes {
  tslA: boolean
  tslASpecial: boolean
  tslB: boolean
  hunting: boolean
  collectorsA: boolean
  collectorsASpecial: boolean
}

// Firearm categories - must match the display labels from getCategoryLabel
export const FIREARM_CATEGORIES = {
  PISTOLS: 'Pistols',
  REVOLVERS: 'Revolvers',
  RIFLES: 'Rifles',
  CARBINES: 'Carbines',
  SHOTGUNS: 'Shotguns',
  BLACKPOWDER: 'Black powder',
  CROSSBOW: 'Crossbow',
  AIRGUNS: 'Airguns',
  AMMUNITION: 'Ammunition',
  AUTOMATIC: 'Schedule 1 (automatic)', // Schedule 1
  REPLICA: 'Replica or Deactivated',
} as const

// Define which licenses allow which categories
const LICENSE_CATEGORY_MAP: Record<keyof LicenseTypes, string[]> = {
  tslA: [
    FIREARM_CATEGORIES.PISTOLS,
    FIREARM_CATEGORIES.REVOLVERS,
    FIREARM_CATEGORIES.RIFLES,
    FIREARM_CATEGORIES.CARBINES,
  ],
  tslASpecial: [
    FIREARM_CATEGORIES.PISTOLS,
    FIREARM_CATEGORIES.REVOLVERS,
    FIREARM_CATEGORIES.RIFLES,
  ],
  tslB: [
    FIREARM_CATEGORIES.SHOTGUNS,
    FIREARM_CATEGORIES.BLACKPOWDER,
    FIREARM_CATEGORIES.CROSSBOW,
    FIREARM_CATEGORIES.AIRGUNS,
  ],
  hunting: [FIREARM_CATEGORIES.SHOTGUNS],
  collectorsA: [
    // Everything except Schedule 1 (Automatic)
    FIREARM_CATEGORIES.PISTOLS,
    FIREARM_CATEGORIES.REVOLVERS,
    FIREARM_CATEGORIES.RIFLES,
    FIREARM_CATEGORIES.CARBINES,
    FIREARM_CATEGORIES.SHOTGUNS,
    FIREARM_CATEGORIES.BLACKPOWDER,
    FIREARM_CATEGORIES.CROSSBOW,
    FIREARM_CATEGORIES.AIRGUNS,
    FIREARM_CATEGORIES.AMMUNITION,
  ],
  collectorsASpecial: [
    // Everything including Schedule 1 (Automatic)
    FIREARM_CATEGORIES.PISTOLS,
    FIREARM_CATEGORIES.REVOLVERS,
    FIREARM_CATEGORIES.RIFLES,
    FIREARM_CATEGORIES.CARBINES,
    FIREARM_CATEGORIES.SHOTGUNS,
    FIREARM_CATEGORIES.BLACKPOWDER,
    FIREARM_CATEGORIES.CROSSBOW,
    FIREARM_CATEGORIES.AIRGUNS,
    FIREARM_CATEGORIES.AMMUNITION,
    FIREARM_CATEGORIES.AUTOMATIC,
  ],
}

/**
 * Get all categories a user can create listings for based on their licenses
 * @param licenseTypes - Object containing user's license types
 * @returns Array of allowed category names
 */
export function getAllowedCategories(
  licenseTypes: LicenseTypes | null
): string[] {
  if (!licenseTypes) {
    // Users without licenses can only post replicas/deactivated
    return [FIREARM_CATEGORIES.REPLICA]
  }

  const allowedCategories = new Set<string>()

  // Add replica/deactivated for all users with any license
  const hasAnyLicense = Object.values(licenseTypes).some(value => value === true)
  if (hasAnyLicense) {
    allowedCategories.add(FIREARM_CATEGORIES.REPLICA)
  }

  // Add categories based on each license type
  Object.entries(licenseTypes).forEach(([licenseType, hasLicense]) => {
    if (hasLicense) {
      const categories =
        LICENSE_CATEGORY_MAP[licenseType as keyof LicenseTypes]
      categories.forEach(category => allowedCategories.add(category))
    }
  })

  return Array.from(allowedCategories).sort()
}

/**
 * Check if a user has the required license to view/contact seller for a specific category
 * @param userLicenseTypes - User's license types
 * @param listingCategory - The category of the listing
 * @returns true if user can view seller info, false otherwise
 */
export function canViewSellerInfo(
  userLicenseTypes: LicenseTypes | null,
  listingCategory: string
): boolean {
  // Replica/deactivated firearms can be viewed by anyone with any license
  if (listingCategory === FIREARM_CATEGORIES.REPLICA) {
    if (!userLicenseTypes) return false
    return Object.values(userLicenseTypes).some(value => value === true)
  }

  // Check if user has the required license for this category
  if (!userLicenseTypes) return false

  const allowedCategories = getAllowedCategories(userLicenseTypes)
  return allowedCategories.includes(listingCategory)
}

/**
 * Get the required license types for a specific category
 * @param category - The firearm category
 * @returns Array of license type names that allow this category
 */
export function getRequiredLicenses(category: string): string[] {
  const licenses: string[] = []

  if (category === FIREARM_CATEGORIES.REPLICA) {
    return ['Any firearms license']
  }

  Object.entries(LICENSE_CATEGORY_MAP).forEach(([licenseType, categories]) => {
    if (categories.includes(category)) {
      licenses.push(formatLicenseName(licenseType as keyof LicenseTypes))
    }
  })

  return licenses
}

/**
 * Format license type key to display name
 */
export function formatLicenseName(licenseType: keyof LicenseTypes): string {
  const nameMap: Record<keyof LicenseTypes, string> = {
    tslA: 'TSL - A',
    tslASpecial: 'TSL - A (special)',
    tslB: 'TSL - B',
    hunting: 'Hunting',
    collectorsA: 'Collectors - A',
    collectorsASpecial: 'Collectors - A (special)',
  }
  return nameMap[licenseType]
}

/**
 * Get user's active licenses as formatted strings
 */
export function getActiveLicenses(licenseTypes: LicenseTypes | null): string[] {
  if (!licenseTypes) return []

  return Object.entries(licenseTypes)
    .filter(([_, hasLicense]) => hasLicense)
    .map(([licenseType]) =>
      formatLicenseName(licenseType as keyof LicenseTypes)
    )
}

