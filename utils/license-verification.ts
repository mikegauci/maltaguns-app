import { createWorker } from 'tesseract.js';

/**
 * Verifies if an uploaded license image contains the required text and is not expired
 * @param file The image file to verify
 * @returns A Promise that resolves to an object containing verification results and extracted text
 */
export async function verifyLicenseImage(file: File): Promise<{ 
  isVerified: boolean; 
  text: string; 
  isExpired: boolean;
  expiryDate: string | null;
  orientation: 'correct' | 'rotated' | 'unknown';
  rotationAngle: number;
  correctedImageUrl?: string;
  hasDate: boolean;
}> {
  try {
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Auto-rotate the image for best OCR results
    const { bestImage, bestRotation, bestConfidence, bestText } = await findBestOrientation(file);
    
    // Create a Tesseract worker
    const worker = await createWorker('eng');
    
    // Use the best rotated image we found
    const { confidence, text } = bestText 
      ? { confidence: bestConfidence, text: bestText } 
      : (await worker.recognize(bestImage)).data;
    
    // Terminate the worker
    await worker.terminate();
    
    // Check if the text contains the required string
    const isVerified = text.includes('POLICE GENERAL HEADQUARTERS');
    
    // Check orientation based on confidence score
    let orientation: 'correct' | 'rotated' | 'unknown' = 'unknown';
    
    // If confidence is very low and we can't find key license words, it might still be rotated
    const hasKeywords = /police|valid|headquarters|license|firearms/i.test(text);
    
    if (confidence > 70 && hasKeywords) {
      orientation = 'correct';
    } else if (confidence < 40 && !hasKeywords) {
      orientation = 'rotated';
    }
    
    // Check expiration date
    const { isExpired, expiryDate, hasDate } = checkExpirationDate(text);
    
    return { 
      isVerified, 
      text, 
      isExpired, 
      expiryDate, 
      orientation, 
      rotationAngle: bestRotation,
      correctedImageUrl: bestImage,
      hasDate
    };
  } catch (error) {
    console.error('License verification error:', error);
    return { 
      isVerified: false, 
      text: '', 
      isExpired: true, 
      expiryDate: null, 
      orientation: 'unknown', 
      rotationAngle: 0,
      hasDate: false
    };
  }
}

/**
 * Attempts to find the best orientation for an image by trying different rotations
 * @param file The image file to process
 * @returns The best orientation and processed image
 */
async function findBestOrientation(file: File): Promise<{ 
  bestImage: string; 
  bestRotation: number; 
  bestConfidence: number;
  bestText: string;
}> {
  try {
    // Convert file to base64 for processing
    const originalImageBase64 = await fileToBase64(file);
    
    // Try each rotation angle
    const rotationAngles = [0, 90, 180, 270];
    let bestRotation = 0;
    let bestConfidence = 0;
    let bestText = '';
    let bestImage = originalImageBase64;
    
    // Create a Tesseract worker once and reuse for all rotations
    const worker = await createWorker('eng');
    
    // Try each rotation and find the one with highest confidence
    for (const angle of rotationAngles) {
      // Only rotate if not 0 degrees
      const imageToProcess = angle === 0 
        ? originalImageBase64 
        : await rotateImage(originalImageBase64, angle);
      
      // Perform OCR on this rotation
      const result = await worker.recognize(imageToProcess);
      const { confidence, text } = result.data;
      
      // Check for keywords that might indicate this is the correct orientation
      const keywords = ['police', 'valid', 'headquarters', 'license', 'firearms', 'malta'];
      const keywordMatches = keywords.filter(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      
      // Create a combined score that considers both confidence and keyword matches
      const combinedScore = confidence + (keywordMatches * 5);
      
      // If this rotation produced better results, save it
      if (combinedScore > bestConfidence) {
        bestRotation = angle;
        bestConfidence = combinedScore;
        bestText = text;
        bestImage = imageToProcess;
      }
    }
    
    // Clean up
    await worker.terminate();
    
    return { bestImage, bestRotation, bestConfidence, bestText };
  } catch (error) {
    console.error('Error finding best orientation:', error);
    return { 
      bestImage: await fileToBase64(file), 
      bestRotation: 0, 
      bestConfidence: 0,
      bestText: ''
    };
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
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Adjust canvas size for rotation
      if (angle === 90 || angle === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      // Translate and rotate
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // Get the rotated image
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = base64Image;
  });
}

/**
 * Checks if the license is expired based on the expiration date in the text
 * @param text The OCR extracted text from the license
 * @returns Object with expiration status and the extracted date
 */
function checkExpirationDate(text: string): { isExpired: boolean; expiryDate: string | null; hasDate: boolean } {
  try {
    // Define regex patterns to find dates after "Valida sa:" or "Valid till:"
    const validaSaPattern = /Valida sa:.*?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i;
    const validTillPattern = /Valid till:.*?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i;
    
    // Try to match either pattern
    const validaSaMatch = text.match(validaSaPattern);
    const validTillMatch = text.match(validTillPattern);
    
    // Extract the date from whichever pattern matched
    const dateStr = validaSaMatch?.[1] || validTillMatch?.[1];
    
    // If no date string found, indicate this
    if (!dateStr) {
      return { isExpired: false, expiryDate: null, hasDate: false };
    }
    
    // Parse the date string into a Date object
    const dateParts = dateStr.split(/[\/\.\-]/);
    
    // Handle different date formats (assuming day/month/year or month/day/year)
    let day, month, year;
    
    if (dateParts.length === 3) {
      // Try both DD/MM/YYYY and MM/DD/YYYY formats
      day = parseInt(dateParts[0], 10);
      month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
      year = parseInt(dateParts[2], 10);
      
      // If year is 2 digits, convert to 4 digits
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
    } else {
      return { isExpired: false, expiryDate: null, hasDate: false };
    }
    
    const expiryDate = new Date(year, month, day);
    const today = new Date();
    
    // Clear time portion for accurate date comparison
    today.setHours(0, 0, 0, 0);
    
    const isExpired = expiryDate < today;
    
    return { 
      isExpired, 
      expiryDate: expiryDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      hasDate: true
    };
  } catch (error) {
    console.error('Error checking expiration date:', error);
    return { isExpired: false, expiryDate: null, hasDate: false };
  }
}

/**
 * Converts a file to base64 encoding
 * @param file The file to convert
 * @returns A Promise that resolves to a base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
} 