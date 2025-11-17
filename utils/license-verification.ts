import { createWorker } from 'tesseract.js'

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
    // Define multiple regex patterns to find dates after various keywords
    const patterns = [
      // "Valida sa:" (Maltese) - most common
      /Valida\s*sa\s*[:\.]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      // "Valid till:" (English)
      /Valid\s*till\s*[:\.]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      // "Valid until:"
      /Valid\s*until\s*[:\.]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      // "Expires:" or "Expiry:"
      /Expir(?:es|y)\s*[:\.]?\s*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
      // Sometimes OCR reads it without the colon
      /Valida\s*sa\s+(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i,
    ]

    let dateStr: string | null = null

    // Try each pattern
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        dateStr = match[1]
        console.log(
          `License expiry date found: ${dateStr} using pattern: ${pattern}`
        )
        break
      }
    }

    // If no date string found, indicate this
    if (!dateStr) {
      console.warn('No expiry date found in license text')
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
      `License expiry check: Expiry date: ${expiryDate.toISOString().split('T')[0]}, Today: ${today.toISOString().split('T')[0]}, Expired: ${isExpired}`
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
    // Extract name from license
    // Look for patterns like "Isem u Kunjom" or "Name and Surname" followed by the actual name
    const namePatterns = [
      /(?:Isem u Kunjom|Name and Surname)[:\s]*([A-Z][A-Z\s]+?)(?:\s{2,}|bint|daught)/i,
      /(?:Isem u Kunjom|Name and Surname)[:\s]*([A-Z][A-Z\s]+?)(?=\s*Il-poghod|residing at)/i,
      /(?:Isem u Kunjom|Name and Surname)[:\s]*([A-Z][A-Z\s]+?)(?=\s*[A-Z]+\s*FLT|TRIQ|STREET)/i,
    ]

    let extractedName: string | null = null

    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        extractedName = match[1].trim()
        break
      }
    }

    // If no match found using patterns, try finding name after specific keywords
    if (!extractedName) {
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (
          /Isem u Kunjom|Name and Surname/i.test(lines[i]) &&
          i + 1 < lines.length
        ) {
          // Name might be on the next line
          const nextLine = lines[i + 1].trim()
          if (nextLine && /^[A-Z\s]+$/.test(nextLine) && nextLine.length > 3) {
            extractedName = nextLine
            break
          }
        }
      }
    }

    if (!extractedName) {
      console.warn('Could not extract name from license')
      return {
        nameMatch: false,
        extractedName: null,
      }
    }

    // Normalize names for comparison
    const licenseName = normalizeString(extractedName)
    const profileName = normalizeString(`${userFirstName} ${userLastName}`)

    // Calculate similarity score
    const similarityScore = calculateStringSimilarity(licenseName, profileName)

    // Consider it a match if similarity is above 70% (accounts for OCR errors, middle names, etc.)
    const nameMatch = similarityScore >= 0.7

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
