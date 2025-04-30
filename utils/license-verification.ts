import { createWorker } from 'tesseract.js';

/**
 * Verifies if an uploaded license image contains the required text
 * @param file The image file to verify
 * @returns A Promise that resolves to an object containing verification result and extracted text
 */
export async function verifyLicenseImage(file: File): Promise<{ isVerified: boolean; text: string }> {
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
    
    return { isVerified, text };
  } catch (error) {
    console.error('License verification error:', error);
    return { isVerified: false, text: '' };
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