import { createWorker } from 'tesseract.js'
import { LicenseTypes } from '@/lib/license-utils'

/**
 * Verifies if an uploaded license image contains the required text and is not expired
 * @param file The image file to verify
 * @param userFirstName User's first name from profile (optional for name verification)
 * @param userLastName User's last name from profile (optional for name verification)
 * @returns A Promise that resolves to an object containing verification results and extracted text
 */
export async function verifyLicenseImage(
  file: File,
  userFirstName?: string,
  userLastName?: string
): Promise<{
  isVerified: boolean
  text: string
  isExpired: boolean
  expiryDate: string | null
  orientation: 'correct' | 'rotated' | 'unknown'
  rotationAngle: number
  correctedImageUrl?: string
  hasDate: boolean
  nameMatch: boolean
  extractedName: string | null
  nameMatchDetails?: {
    licenseName: string
    profileName: string
    similarityScore: number
  }
  licenseTypes: LicenseTypes
}> {
  try {
    if (!file) {
      throw new Error('No file provided')
    }

    // Auto-rotate the image for best OCR results
    const { bestImage, bestRotation, bestConfidence, bestText } =
      await findBestOrientation(file)

    // Create a Tesseract worker
    const worker = await createWorker('eng')

    // Use the best rotated image we found
    const { confidence, text } = bestText
      ? { confidence: bestConfidence, text: bestText }
      : (await worker.recognize(bestImage)).data

    // Terminate the worker
    await worker.terminate()

    // Check if the text contains the required string
    const hasPoliceHeader = text.includes('POLICE GENERAL HEADQUARTERS')

    // Check orientation based on confidence score
    let orientation: 'correct' | 'rotated' | 'unknown' = 'unknown'

    // If confidence is very low and we can't find key license words, it might still be rotated
    const hasKeywords = /police|valid|headquarters|license|firearms/i.test(text)

    if (confidence > 70 && hasKeywords) {
      orientation = 'correct'
    } else if (confidence < 40 && !hasKeywords) {
      orientation = 'rotated'
    }

    // Check expiration date
    const { isExpired, expiryDate, hasDate } = checkExpirationDate(text)

    // Extract and verify name if user details provided
    const nameVerification = verifyName(text, userFirstName, userLastName)

    // Detect license types from the text
    const licenseTypes = detectLicenseTypes(text)

    // License is only verified if: has police header, not expired, AND name matches (if name provided)
    const isVerified =
      hasPoliceHeader &&
      !isExpired &&
      (nameVerification.nameMatch || !userFirstName || !userLastName)

    return {
      isVerified,
      text,
      isExpired,
      expiryDate,
      orientation,
      rotationAngle: bestRotation,
      correctedImageUrl: bestImage,
      hasDate,
      nameMatch: nameVerification.nameMatch,
      extractedName: nameVerification.extractedName,
      nameMatchDetails: nameVerification.nameMatchDetails,
      licenseTypes,
    }
  } catch (error) {
    console.error('License verification error:', error)
    return {
      isVerified: false,
      text: '',
      isExpired: true,
      expiryDate: null,
      orientation: 'unknown',
      rotationAngle: 0,
      hasDate: false,
      nameMatch: false,
      extractedName: null,
      licenseTypes: {
        tslA: false,
        tslASpecial: false,
        tslB: false,
        hunting: false,
        collectorsA: false,
        collectorsASpecial: false,
      },
    }
  }
}

/**
 * Attempts to find the best orientation for an image by trying different rotations
 * @param file The image file to process
 * @returns The best orientation and processed image
 */
async function findBestOrientation(file: File): Promise<{
  bestImage: string
  bestRotation: number
  bestConfidence: number
  bestText: string
}> {
  try {
    // Convert file to base64 for processing
    const originalImageBase64 = await fileToBase64(file)

    // Try each rotation angle
    const rotationAngles = [0, 90, 180, 270]
    let bestRotation = 0
    let bestConfidence = 0
    let bestText = ''
    let bestImage = originalImageBase64

    // Create a Tesseract worker once and reuse for all rotations
    const worker = await createWorker('eng')

    // Try each rotation and find the one with highest confidence
    for (const angle of rotationAngles) {
      // Only rotate if not 0 degrees
      const imageToProcess =
        angle === 0
          ? originalImageBase64
          : await rotateImage(originalImageBase64, angle)

      // Perform OCR on this rotation
      const result = await worker.recognize(imageToProcess)
      const { confidence, text } = result.data

      // Check for keywords that might indicate this is the correct orientation
      const keywords = [
        'police',
        'valid',
        'headquarters',
        'license',
        'firearms',
        'malta',
      ]
      const keywordMatches = keywords.filter(keyword =>
        text.toLowerCase().includes(keyword.toLowerCase())
      ).length

      // Create a combined score that considers both confidence and keyword matches
      const combinedScore = confidence + keywordMatches * 5

      // If this rotation produced better results, save it
      if (combinedScore > bestConfidence) {
        bestRotation = angle
        bestConfidence = combinedScore
        bestText = text
        bestImage = imageToProcess
      }
    }

    // Clean up
    await worker.terminate()

    return { bestImage, bestRotation, bestConfidence, bestText }
  } catch (error) {
    console.error('Error finding best orientation:', error)
    return {
      bestImage: await fileToBase64(file),
      bestRotation: 0,
      bestConfidence: 0,
      bestText: '',
    }
  }
}

/**
 * Attempts to find the best orientation for an image with progress updates
 * @param file The image file to process
 * @param setProgress Optional callback to update progress
 * @returns The best orientation and processed image
 */
async function findBestOrientationWithProgress(
  file: File,
  setProgress?: (progress: number) => void
): Promise<{
  bestImage: string
  bestRotation: number
  bestConfidence: number
  bestText: string
}> {
  try {
    // Convert file to base64 for processing
    const originalImageBase64 = await fileToBase64(file)

    // Try each rotation angle
    const rotationAngles = [0, 90, 180, 270]
    let bestRotation = 0
    let bestConfidence = 0
    let bestText = ''
    let bestImage = originalImageBase64

    // Create a Tesseract worker once and reuse for all rotations
    const worker = await createWorker('eng')

    // Try each rotation and find the one with highest confidence
    for (let i = 0; i < rotationAngles.length; i++) {
      const angle = rotationAngles[i]

      // Update progress: 48%, 53%, 58%, 63% for each rotation
      setProgress?.(48 + i * 5)

      // Only rotate if not 0 degrees
      const imageToProcess =
        angle === 0
          ? originalImageBase64
          : await rotateImage(originalImageBase64, angle)

      // Perform OCR on this rotation
      const result = await worker.recognize(imageToProcess)
      const { confidence, text } = result.data

      // Check for keywords that might indicate this is the correct orientation
      const keywords = [
        'police',
        'valid',
        'headquarters',
        'license',
        'firearms',
        'malta',
      ]
      const keywordMatches = keywords.filter(keyword =>
        text.toLowerCase().includes(keyword.toLowerCase())
      ).length

      // Create a combined score that considers both confidence and keyword matches
      const combinedScore = confidence + keywordMatches * 5

      // If this rotation produced better results, save it
      if (combinedScore > bestConfidence) {
        bestRotation = angle
        bestConfidence = combinedScore
        bestText = text
        bestImage = imageToProcess
      }
    }

    // Clean up
    await worker.terminate()
    setProgress?.(68)

    return { bestImage, bestRotation, bestConfidence, bestText }
  } catch (error) {
    console.error('Error finding best orientation:', error)
    return {
      bestImage: await fileToBase64(file),
      bestRotation: 0,
      bestConfidence: 0,
      bestText: '',
    }
  }
}

/**
 * Rotates an image by the specified angle
 * @param base64Image Base64 encoded image
 * @param angle Rotation angle in degrees
 * @returns Promise resolving to rotated base64 image
 */
function rotateImage(base64Image: string, angle: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Adjust canvas size for rotation
      if (angle === 90 || angle === 270) {
        canvas.width = img.height
        canvas.height = img.width
      } else {
        canvas.width = img.width
        canvas.height = img.height
      }

      // Translate and rotate
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((angle * Math.PI) / 180)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)

      // Get the rotated image
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = base64Image
  })
}

/**
 * Checks if the license is expired based on the expiration date in the text
 * @param text The OCR extracted text from the license
 * @returns Object with expiration status and the extracted date
 */
function checkExpirationDate(text: string): {
  isExpired: boolean
  expiryDate: string | null
  hasDate: boolean
} {
  try {
    console.log('Searching for expiry date in text...')

    let dateStr: string | null = null
    let matchedPattern = ''

    // Strategy 1: Try pattern matching on full text
    const patterns = [
      {
        regex:
          /Valida\s*sa\s*[:\.]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
        name: 'Valida sa:',
      },
      {
        regex: /Valid\s*sa\s*[:\.]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
        name: 'Valid sa:',
      },
      {
        regex:
          /Valid\s*till\s*[:\.]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
        name: 'Valid till:',
      },
      {
        regex:
          /Expir(?:es|y)\s*[:\.]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
        name: 'Expiry:',
      },
      {
        regex:
          /(?:valida|valid)[^\d]{0,20}(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
        name: 'valida/valid (loose)',
      },
    ]

    for (const { regex, name } of patterns) {
      const match = text.match(regex)
      if (match && match[1]) {
        dateStr = match[1]
        matchedPattern = name
        console.log(
          `✓ License expiry date found: ${dateStr} using pattern: ${name}`
        )
        break
      }
    }

    // Strategy 2: Line-by-line search (in case date is on different line than label)
    if (!dateStr) {
      console.log('Pattern matching failed, trying line-by-line search...')
      const lines = text.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Check if this line contains the expiry label
        if (/Valida\s*sa|Valid\s*(?:sa|till|until)|Expir/i.test(line)) {
          console.log(`Found expiry label at line ${i}: "${line}"`)

          // Check same line for date
          const dateMatch = line.match(
            /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/
          )
          if (dateMatch) {
            dateStr = dateMatch[1]
            matchedPattern = 'same line as label'
            console.log(`✓ Date found on same line: ${dateStr}`)
            break
          }

          // Check next few lines for date
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nextLine = lines[j].trim()
            const dateMatch = nextLine.match(
              /(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/
            )
            if (dateMatch) {
              dateStr = dateMatch[1]
              matchedPattern = `line ${j} after label`
              console.log(
                `✓ Date found on next line ${j}: "${nextLine}" -> ${dateStr}`
              )
              break
            }
          }

          if (dateStr) break
        }
      }
    }

    // Strategy 3: Find ANY date that looks like expiry (last resort)
    if (!dateStr) {
      console.log('Line search failed, looking for any date pattern...')
      const allDates = text.match(/(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/g)
      if (allDates && allDates.length > 0) {
        // Take the last date found (usually expiry is near the end)
        dateStr = allDates[allDates.length - 1]
        matchedPattern = 'fallback (last date found)'
        console.log(`⚠ Using fallback - last date found: ${dateStr}`)
      }
    }

    if (!dateStr) {
      console.warn('❌ No expiry date found in license text')
      console.log('Text searched (first 500 chars):', text.substring(0, 500))
      return { isExpired: false, expiryDate: null, hasDate: false }
    }

    // Parse the date string into a Date object
    const dateParts = dateStr.split(/[\/\.\-]/)

    // Handle different date formats (assuming DD/MM/YYYY format for Malta)
    let day, month, year

    if (dateParts.length === 3) {
      day = parseInt(dateParts[0], 10)
      month = parseInt(dateParts[1], 10) - 1 // JS months are 0-indexed
      year = parseInt(dateParts[2], 10)

      // If year is 2 digits, convert to 4 digits
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year
      }

      // Validate the parsed values
      if (
        isNaN(day) ||
        isNaN(month) ||
        isNaN(year) ||
        day < 1 ||
        day > 31 ||
        month < 0 ||
        month > 11
      ) {
        console.error(
          `Invalid date parts parsed: day=${day}, month=${month + 1}, year=${year}`
        )
        return { isExpired: false, expiryDate: null, hasDate: false }
      }
    } else {
      console.error(`Invalid date format: ${dateStr}`)
      return { isExpired: false, expiryDate: null, hasDate: false }
    }

    const expiryDate = new Date(year, month, day)
    const today = new Date()

    // Clear time portion for accurate date comparison
    today.setHours(0, 0, 0, 0)
    expiryDate.setHours(0, 0, 0, 0)

    const isExpired = expiryDate < today

    console.log(
      `License expiry check [${matchedPattern}]: Expiry date: ${expiryDate.toISOString().split('T')[0]}, Today: ${today.toISOString().split('T')[0]}, Expired: ${isExpired}`
    )

    return {
      isExpired,
      expiryDate: expiryDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      hasDate: true,
    }
  } catch (error) {
    console.error('Error checking expiration date:', error)
    return { isExpired: false, expiryDate: null, hasDate: false }
  }
}

/**
 * Converts a file to base64 encoding
 * @param file The file to convert
 * @returns A Promise that resolves to a base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

/**
 * Extracts and verifies the name from the license text
 * @param text OCR extracted text from the license
 * @param userFirstName User's first name from profile
 * @param userLastName User's last name from profile
 * @returns Name verification results
 */
function verifyName(
  text: string,
  userFirstName?: string,
  userLastName?: string
): {
  nameMatch: boolean
  extractedName: string | null
  nameMatchDetails?: {
    licenseName: string
    profileName: string
    similarityScore: number
  }
} {
  // If no user name provided, skip verification
  if (!userFirstName || !userLastName) {
    return {
      nameMatch: true, // Don't block if no name provided (backward compatibility)
      extractedName: null,
    }
  }

  try {
    // Extract name from license - simplified approach
    let extractedName: string | null = null

    // Split text into lines for processing
    const lines = text.split('\n')

    // Look for the line containing the name label
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Check if this line contains the name label
      if (/Isem u Kunjom|Name and Surname/i.test(line)) {
        console.log(`Found name label at line ${i}: "${line}"`)

        // Helper function to validate a name
        const isValidName = (text: string): boolean => {
          if (!text || text.length < 5) return false
          const words = text.split(/\s+/).filter(w => w.length > 1)
          if (words.length < 2) return false
          if (!/^[A-Z\s]+$/i.test(text)) return false
          if (/^(bin|bint|son|daughter)$/i.test(text)) return false
          if (/(residing|li jogghod|address|karta|id card)/i.test(text))
            return false
          return true
        }

        // Strategy 1: Check same line after label
        const remainingText = line
          .replace(/.*(?:Isem u Kunjom|Name and Surname)[:\s]*/i, '')
          .trim()
        if (remainingText) {
          console.log(`Checking same line remaining text: "${remainingText}"`)
          // Split by relationship terms to get name before them
          const nameParts = remainingText.split(
            /\s+(?:bin|bint|son|daughter)\s+/i
          )
          if (nameParts[0] && isValidName(nameParts[0])) {
            extractedName = nameParts[0].trim()
            console.log(
              `✓ Name found on same line (before relationship term): "${extractedName}"`
            )
            break
          }
        }

        // Strategy 2: Check lines BEFORE the label (name might appear above)
        for (let j = Math.max(0, i - 2); j < i; j++) {
          const prevLine = lines[j].trim()
          console.log(`Checking line ${j} (before label): "${prevLine}"`)
          if (isValidName(prevLine)) {
            extractedName = prevLine
            console.log(
              `✓ Name found BEFORE label at line ${j}: "${extractedName}"`
            )
            break
          }
        }

        if (extractedName) break

        // Strategy 3: Check lines AFTER the label
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j].trim()
          if (!nextLine) continue

          console.log(`Checking line ${j} (after label): "${nextLine}"`)

          // Skip pure relationship terms
          if (/^(bin|bint|son|daughter)$/i.test(nextLine)) {
            console.log(`  → Skipping relationship term`)
            continue
          }

          // Check if this line has a valid name
          if (isValidName(nextLine)) {
            extractedName = nextLine
            console.log(
              `✓ Name found AFTER label at line ${j}: "${extractedName}"`
            )
            break
          }
        }

        if (extractedName) break
      }
    }

    if (!extractedName) {
      console.warn('Could not extract name from license text')
      return {
        nameMatch: false,
        extractedName: null,
      }
    }

    // Clean up the extracted name - remove extra whitespace and common OCR artifacts
    extractedName = extractedName
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove special characters
      .trim()
      .toUpperCase()

    // Normalize names for comparison
    const licenseName = normalizeString(extractedName)
    const profileName = normalizeString(`${userFirstName} ${userLastName}`)

    // Split license name into words for matching
    const licenseWords = licenseName.split(/\s+/).filter(w => w.length > 1)

    // Check if profile first name and last name appear in license (in any order)
    const profileFirstName = normalizeString(userFirstName)
    const profileLastName = normalizeString(userLastName)

    let firstNameMatch = false
    let lastNameMatch = false

    for (const licenseWord of licenseWords) {
      // Check for first name match (allow partial match for OCR errors)
      if (!firstNameMatch) {
        const firstSimilarity = calculateStringSimilarity(
          licenseWord,
          profileFirstName
        )
        if (firstSimilarity >= 0.75) {
          firstNameMatch = true
        }
      }

      // Check for last name match (allow partial match for OCR errors)
      if (!lastNameMatch) {
        const lastSimilarity = calculateStringSimilarity(
          licenseWord,
          profileLastName
        )
        if (lastSimilarity >= 0.75) {
          lastNameMatch = true
        }
      }

      if (firstNameMatch && lastNameMatch) break
    }

    // Consider it a match if both first and last name match
    const nameMatch = firstNameMatch && lastNameMatch

    // Calculate overall similarity for reporting
    const similarityScore = calculateStringSimilarity(licenseName, profileName)

    console.log(
      `Name matching - License: "${extractedName}", Profile: "${userFirstName} ${userLastName}"`
    )
    console.log(
      `First name match: ${firstNameMatch}, Last name match: ${lastNameMatch}, Overall similarity: ${Math.round(similarityScore * 100)}%`
    )

    return {
      nameMatch,
      extractedName,
      nameMatchDetails: {
        licenseName: extractedName,
        profileName: `${userFirstName} ${userLastName}`,
        similarityScore: Math.round(similarityScore * 100),
      },
    }
  } catch (error) {
    console.error('Error verifying name:', error)
    return {
      nameMatch: false,
      extractedName: null,
    }
  }
}

/**
 * Normalizes a string for comparison by removing extra spaces, converting to lowercase, etc.
 * @param str The string to normalize
 * @returns Normalized string
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Calculates the Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns The edit distance (number of changes needed)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1 === s2) return 0

  const matrix: number[][] = []

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[s2.length][s1.length]
}

/**
 * Calculates the similarity between two strings using Levenshtein distance
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  // If strings are identical, return 1
  if (s1 === s2) return 1

  // Calculate Levenshtein distance
  const matrix: number[][] = []

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  const distance = matrix[s2.length][s1.length]
  const maxLength = Math.max(s1.length, s2.length)

  // Convert distance to similarity score (0 to 1)
  return 1 - distance / maxLength
}

/**
 * Detects license types from the OCR text
 * @param text OCR extracted text from the license
 * @returns LicenseTypes object with detected licenses set to true
 */
function detectLicenseTypes(text: string): LicenseTypes {
  const normalizedText = text.toLowerCase()

  const licenseTypes: LicenseTypes = {
    tslA: false,
    tslASpecial: false,
    tslB: false,
    hunting: false,
    collectorsA: false,
    collectorsASpecial: false,
  }

  // Detect TSL-A Special (must check this before regular TSL-A)
  // Patterns: "TSA TARGET SHOOTER SPECIAL", "TARGET SHOOTER A SPECIAL", "LICENZJA SPECJALI"
  if (
    /ts[al].*target.*shooter.*spec[ia]/i.test(normalizedText) ||
    /target.*shooter.*spec[ia]/i.test(normalizedText) ||
    /licenz[jz]a.*specjal/i.test(normalizedText)
  ) {
    licenseTypes.tslASpecial = true
    console.log('Detected: TSL-A (special)')
  }

  // Detect regular TSL-A ONLY if TSL-A Special is not detected
  // Patterns: "TARGET SHOOTER A" (but not special), "LONG/SHORT FIREARM"
  if (!licenseTypes.tslASpecial) {
    if (
      /target.*shooter.*a\b/i.test(normalizedText) ||
      /long.*short.*firearm/i.test(normalizedText)
    ) {
      licenseTypes.tslA = true
      console.log('Detected: TSL-A')
    }
  }

  // Detect TSL-B
  // Patterns: "TARGET SHOOTER B", "S/GUN", "SHOTGUN"
  if (
    /target.*shooter.*b/i.test(normalizedText) ||
    /s\/gun/i.test(normalizedText)
  ) {
    licenseTypes.tslB = true
    console.log('Detected: TSL-B')
  }

  // Detect Hunting License
  // Patterns: "HUNTING", "KACCA"
  if (/hunting/i.test(normalizedText) || /kac[cq]a/i.test(normalizedText)) {
    licenseTypes.hunting = true
    console.log('Detected: Hunting')
  }

  // Detect Collectors-A Special (must check before regular Collectors-A)
  // Patterns: "COLLECTOR LICENCE A SPECIAL", "KOLLEZZJONI SPECJALI"
  if (
    /collector.*licen[cs]e.*a.*spec[ia]/i.test(normalizedText) ||
    /kollezz.*specjal/i.test(normalizedText)
  ) {
    licenseTypes.collectorsASpecial = true
    console.log('Detected: Collectors-A (special)')
  }

  // Detect regular Collectors-A ONLY if Collectors-A Special is not detected
  // Patterns: "COLLECTOR LICENCE A" (but not special), "GHAZ-ZAMMA"
  if (!licenseTypes.collectorsASpecial) {
    if (
      /collector.*licen[cs]e.*a\b/i.test(normalizedText) ||
      /gh[ao]z[- ]?[sz]amma/i.test(normalizedText) ||
      /kollezz[jz]oni/i.test(normalizedText)
    ) {
      licenseTypes.collectorsA = true
      console.log('Detected: Collectors-A')
    }
  }

  return licenseTypes
}

/**
 * Preprocesses an ID card image for better OCR results
 * Enhances contrast and reduces noise from holograms/watermarks
 */
async function preprocessIdCardImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      try {
        // Set canvas to image dimensions
        canvas.width = img.width
        canvas.height = img.height

        // Draw the original image
        ctx.drawImage(img, 0, 0)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Convert to grayscale and enhance contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale conversion
          const gray =
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

          // High contrast adjustment - makes text darker and background lighter
          // This helps with holographic patterns
          let enhanced = gray
          if (gray < 128) {
            // Darken dark areas (text)
            enhanced = gray * 0.7
          } else {
            // Brighten light areas (background)
            enhanced = 255 - (255 - gray) * 0.5
          }

          // Apply the enhanced value
          data[i] = enhanced // R
          data[i + 1] = enhanced // G
          data[i + 2] = enhanced // B
          // Alpha stays the same
        }

        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0)

        // Convert canvas to blob and then to File
        canvas.toBlob(
          blob => {
            if (blob) {
              const processedFile = new File([blob], file.name, {
                type: 'image/png',
                lastModified: Date.now(),
              })
              console.log('✓ ID card image preprocessed for better OCR')
              resolve(processedFile)
            } else {
              reject(new Error('Failed to create blob from canvas'))
            }
          },
          'image/png',
          1.0
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for preprocessing'))
    }

    // Load the image
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Verifies if an uploaded ID card image is valid and matches the user's name
 * @param file The image file to verify
 * @param userFirstName User's first name from profile
 * @param userLastName User's last name from profile
 * @param setProgress Optional callback to update progress during verification
 * @returns A Promise that resolves to an object containing verification results
 */
export async function verifyIdCardImage(
  file: File,
  userFirstName: string,
  userLastName: string,
  setProgress?: (progress: number) => void
): Promise<{
  isVerified: boolean
  text: string
  nameMatch: boolean
  extractedName: string | null
  nameMatchDetails?: {
    idCardName: string
    profileName: string
    similarityScore: number
  }
}> {
  try {
    if (!file) {
      throw new Error('No file provided')
    }

    console.log('Starting ID card verification...')

    // Preprocess the image for better OCR results (especially for ID cards with holograms)
    setProgress?.(42)
    const preprocessedFile = await preprocessIdCardImage(file)

    // Auto-rotate the image for best OCR results
    setProgress?.(45)
    const { bestImage, bestRotation, bestConfidence, bestText } =
      await findBestOrientationWithProgress(preprocessedFile, setProgress)

    console.log(
      `Best orientation: ${bestRotation}°, Confidence: ${bestConfidence}%`
    )

    // Create a Tesseract worker with enhanced settings for ID cards
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    // Configure Tesseract for better text recognition
    await worker.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /.-'ĄĊĖĠĦŻàèìòùÀÈÌÒÙ",
    })

    // Use the best rotated image we found
    const { confidence, text } = bestText
      ? { confidence: bestConfidence, text: bestText }
      : (await worker.recognize(bestImage)).data

    // Terminate the worker
    await worker.terminate()

    console.log('ID Card OCR Text:', text)
    console.log('OCR Confidence:', confidence)

    // Check if this is a Malta ID card - use flexible patterns to handle OCR errors
    const normalizedText = text.replace(/\s+/g, ' ').toUpperCase()

    // Multiple patterns to catch variations in OCR
    const idCardPatterns = [
      /KARTA.*TAL.*IDENTIT/i, // "KARTA TAL-IDENTITÀ"
      /IDENTITY.*CARD/i, // "IDENTITY CARD"
      /REPUBBLIKA.*TA.*MALTA/i, // "REPUBBLIKA TA' MALTA"
      /REPUBLIC.*OF.*MALTA/i, // "REPUBLIC OF MALTA"
      /ISEM.*NAME/i, // "ISEM / NAME" field
      /NRU.*NO.*\d{7,8}[A-Z]/i, // ID number format "NRU./NO. 0024894M"
      /NAZZJONAL/i, // "NAZZJONALITÀ"
      /NATIONALITY/i, // "NATIONALITY"
      /MLT/, // Nationality code
      /TISWA.*MINN.*VALID.*FROM/i, // Date fields
      /TISWA.*SA.*VALID.*UNTIL/i, // Date fields
    ]

    const matchCount = idCardPatterns.filter(pattern =>
      pattern.test(text)
    ).length
    const isMaltaIdCard = matchCount >= 2 // At least 2 patterns must match

    console.log(`ID card pattern matches: ${matchCount}/11`)

    if (!isMaltaIdCard) {
      console.warn('Not a valid Malta ID card - missing required header text')
      console.log('Text snippet:', text.substring(0, 200))
      return {
        isVerified: false,
        text,
        nameMatch: false,
        extractedName: null,
      }
    }

    console.log('✓ Valid Malta ID card detected')

    // Extract and verify name
    const extractedName = extractIdCardName(text)
    console.log('Extracted name from ID card:', extractedName)

    let nameMatch = false
    let nameMatchDetails

    if (extractedName && userFirstName && userLastName) {
      const result = verifyIdCardName(
        extractedName,
        userFirstName,
        userLastName
      )
      nameMatch = result.matches
      nameMatchDetails = {
        idCardName: extractedName,
        profileName: `${userFirstName} ${userLastName}`,
        similarityScore: result.similarityScore,
      }
    }

    const isVerified = isMaltaIdCard && nameMatch

    return {
      isVerified,
      text,
      nameMatch,
      extractedName,
      nameMatchDetails,
    }
  } catch (error) {
    console.error('Error verifying ID card:', error)
    throw new Error('Failed to verify ID card. Please try again.')
  }
}

/**
 * Extracts the name from ID card OCR text
 * Uses multiple strategies to find the name on the ID card
 * Handles cases where surname and first name are on separate lines
 */
function extractIdCardName(text: string): string | null {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  console.log('Searching for name in ID card text...')

  // Strategy 1: Look for "ISEM / NAME" or "ISEM/NAME" label
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if this line contains the name label (flexible matching)
    if (
      /ISEM.*\/?.*NAME/i.test(line) ||
      (/ISEM/i.test(line) && /NAME/i.test(line))
    ) {
      console.log(`Found ISEM/NAME label at line ${i}: "${line}"`)

      // Try to extract name from the same line (after the label)
      const sameLine = line
        .replace(/.*ISEM\s*\/?\s*NAME[:\s]*/i, '')
        .replace(/ISEM/i, '')
        .replace(/NAME/i, '')
        .trim()
      if (sameLine && isValidIdCardName(sameLine)) {
        console.log(`Name extracted from same line: "${sameLine}"`)
        return cleanName(sameLine)
      }

      // Check the next few lines for the name (could be surname + firstname on separate lines)
      const nameParts: string[] = []
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim()

        // Stop if we hit another field label
        if (
          /^(SESS|SEX|NAZZJONAL|NATIONALITY|DATA|DATE|TISWA|VALID|FIRMA|SIGNATURE)/i.test(
            nextLine
          )
        ) {
          break
        }

        if (nextLine && isValidIdCardName(nextLine)) {
          console.log(`Found name part at line ${j}: "${nextLine}"`)
          nameParts.push(nextLine)

          // Try to get at least 2 lines (surname + firstname)
          if (nameParts.length >= 2) {
            const fullName = nameParts.join(' ')
            console.log(`Combined name from multiple lines: "${fullName}"`)
            return cleanName(fullName)
          }
        }
      }

      // If we got at least one name part, use it
      if (nameParts.length > 0) {
        const fullName = nameParts.join(' ')
        console.log(`Name from ${nameParts.length} line(s): "${fullName}"`)
        return cleanName(fullName)
      }
    }
  }

  // Strategy 2: Look for lines that start with "ISEM" or "NAME" alone
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^ISEM\b/i.test(line) || /^NAME\b/i.test(line)) {
      console.log(`Found name label at line ${i}: "${line}"`)

      // Check next few lines and combine them
      const nameParts: string[] = []
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim()

        // Stop if we hit another field label
        if (
          /^(SESS|SEX|NAZZJONAL|NATIONALITY|DATA|DATE|TISWA|VALID|FIRMA|SIGNATURE)/i.test(
            nextLine
          )
        ) {
          break
        }

        if (nextLine && isValidIdCardName(nextLine)) {
          nameParts.push(nextLine)

          if (nameParts.length >= 2) {
            const fullName = nameParts.join(' ')
            console.log(`Combined name: "${fullName}"`)
            return cleanName(fullName)
          }
        }
      }

      if (nameParts.length > 0) {
        const fullName = nameParts.join(' ')
        return cleanName(fullName)
      }
    }
  }

  console.warn('Could not extract name from ID card')
  return null
}

/**
 * Validates if a string looks like a valid name from an ID card
 */
function isValidIdCardName(text: string): boolean {
  // Must be at least 2 characters
  if (text.length < 2) return false

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(text)) return false

  // Must be mostly letters (at least 70% alphabetic characters)
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length
  const totalChars = text.replace(/\s/g, '').length
  if (totalChars > 0 && letterCount / totalChars < 0.7) return false

  // Should not contain document numbers or ID patterns
  if (/NRU|NO\.|DOC|CAN|\d{7,}/i.test(text)) return false

  // Should not be a common ID card field or label
  const invalidPatterns = [
    /^ISEM$/i,
    /^NAME$/i,
    /^KARTA/i,
    /^IDENTITY/i,
    /^CARD/i,
    /^REPUBBLIKA/i,
    /^REPUBLIC/i,
    /^MALTA/i,
    /^NAZZJONAL/i,
    /^NATIONALITY/i,
    /^DATA/i,
    /^DATE/i,
    /^BIRTH/i,
    /^TWEILD/i,
    /^\d+$/, // Only digits
    /^MLT$/i,
    /^M$/i,
    /^F$/i,
  ]

  for (const pattern of invalidPatterns) {
    if (pattern.test(text)) return false
  }

  return true
}

/**
 * Cleans up an extracted name by removing extra characters
 */
function cleanName(name: string): string {
  // Remove any leading/trailing special characters but keep internal ones
  return name
    .trim()
    .replace(/^[^a-zA-Z]+/, '') // Remove leading non-letters
    .replace(/[^a-zA-Z\s'-]+$/, '') // Remove trailing non-letters (keep spaces, hyphens, apostrophes)
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim()
}

/**
 * Verifies if the extracted ID card name matches the user's profile name
 * Uses the same logic as license name verification
 */
function verifyIdCardName(
  idCardName: string,
  profileFirstName: string,
  profileLastName: string
): {
  matches: boolean
  similarityScore: number
} {
  const normalizedIdCardName = idCardName.toUpperCase()
  const normalizedProfileName =
    `${profileFirstName} ${profileLastName}`.toUpperCase()

  console.log(
    `Name matching - ID Card: "${normalizedIdCardName}", Profile: "${normalizedProfileName}"`
  )

  // Split names into words for flexible matching
  const idCardWords = normalizedIdCardName
    .split(/\s+/)
    .filter(w => w.length > 1)
  const profileFirstNameNorm = profileFirstName.toUpperCase()
  const profileLastNameNorm = profileLastName.toUpperCase()

  // Check if both first and last name from profile appear in the ID card text
  // This handles cases where ID card might have middle names
  let firstNameMatch = false
  let lastNameMatch = false

  for (const word of idCardWords) {
    // Check for first name match (with some tolerance for OCR errors)
    if (
      word === profileFirstNameNorm ||
      levenshteinDistance(word, profileFirstNameNorm) <=
        Math.max(1, profileFirstNameNorm.length * 0.25)
    ) {
      firstNameMatch = true
      console.log(`First name match: "${word}" ≈ "${profileFirstNameNorm}"`)
    }

    // Check for last name match (with some tolerance for OCR errors)
    if (
      word === profileLastNameNorm ||
      levenshteinDistance(word, profileLastNameNorm) <=
        Math.max(1, profileLastNameNorm.length * 0.25)
    ) {
      lastNameMatch = true
      console.log(`Last name match: "${word}" ≈ "${profileLastNameNorm}"`)
    }
  }

  const matches = firstNameMatch && lastNameMatch

  // Calculate similarity score
  const distance = levenshteinDistance(
    normalizedIdCardName,
    normalizedProfileName
  )
  const maxLength = Math.max(
    normalizedIdCardName.length,
    normalizedProfileName.length
  )
  const similarityScore = Math.round(((maxLength - distance) / maxLength) * 100)

  console.log(
    `First name match: ${firstNameMatch}, Last name match: ${lastNameMatch}, Overall similarity: ${similarityScore}%`
  )

  return {
    matches,
    similarityScore,
  }
}
