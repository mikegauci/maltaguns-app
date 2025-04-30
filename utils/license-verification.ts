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
}> {
  try {
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Create a Tesseract worker
    const worker = await createWorker('eng');
    
    // Convert file to base64 for Tesseract
    const base64Image = await fileToBase64(file);
    
    // Recognize text in the image
    const { data: { text } } = await worker.recognize(base64Image);
    
    // Terminate the worker
    await worker.terminate();
    
    // Check if the text contains the required string
    const isVerified = text.includes('POLICE GENERAL HEADQUARTERS');
    
    // Check expiration date
    const { isExpired, expiryDate } = checkExpirationDate(text);
    
    return { isVerified, text, isExpired, expiryDate };
  } catch (error) {
    console.error('License verification error:', error);
    return { isVerified: false, text: '', isExpired: true, expiryDate: null };
  }
}

/**
 * Checks if the license is expired based on the expiration date in the text
 * @param text The OCR extracted text from the license
 * @returns Object with expiration status and the extracted date
 */
function checkExpirationDate(text: string): { isExpired: boolean; expiryDate: string | null } {
  try {
    // Define regex patterns to find dates after "Valida sa:" or "Valid till:"
    const validaSaPattern = /Valida sa:.*?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i;
    const validTillPattern = /Valid till:.*?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/i;
    
    // Try to match either pattern
    const validaSaMatch = text.match(validaSaPattern);
    const validTillMatch = text.match(validTillPattern);
    
    // Extract the date from whichever pattern matched
    const dateStr = validaSaMatch?.[1] || validTillMatch?.[1];
    
    if (!dateStr) {
      return { isExpired: true, expiryDate: null };
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
      return { isExpired: true, expiryDate: null };
    }
    
    const expiryDate = new Date(year, month, day);
    const today = new Date();
    
    // Clear time portion for accurate date comparison
    today.setHours(0, 0, 0, 0);
    
    const isExpired = expiryDate < today;
    
    return { 
      isExpired, 
      expiryDate: expiryDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
    };
  } catch (error) {
    console.error('Error checking expiration date:', error);
    return { isExpired: true, expiryDate: null };
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