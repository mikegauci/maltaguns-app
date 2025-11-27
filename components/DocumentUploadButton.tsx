import { Input } from '@/components/ui/input'
import { Upload, RefreshCw, Loader2 } from 'lucide-react'

interface DocumentUploadButtonProps {
  id: string
  label: string
  replaceLabel: string
  isUploading: boolean
  uploadProgress: number
  hasExistingDocument: boolean
  acceptedFormats?: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void // eslint-disable-line unused-imports/no-unused-vars
}

export const DocumentUploadButton = ({
  id,
  label,
  replaceLabel,
  isUploading,
  uploadProgress,
  hasExistingDocument,
  acceptedFormats = 'image/*,.heic,.heif',
  onChange,
}: DocumentUploadButtonProps) => {
  // Check if we're in the verification phase (ID card is 40-70%, License is 30-70%)
  const isVerifying = isUploading && uploadProgress >= 30 && uploadProgress < 90

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={acceptedFormats}
          onChange={onChange}
          disabled={isUploading}
          className="hidden"
          id={id}
        />
        <label
          htmlFor={id}
          className={`bg-black text-white px-4 py-2 rounded flex items-center transition-colors ${
            isUploading
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:bg-gray-800'
          }`}
          style={isUploading ? { pointerEvents: 'none' } : {}}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : hasExistingDocument ? (
            <RefreshCw className="h-4 w-4 mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {isUploading
            ? `Uploading... ${uploadProgress}%`
            : hasExistingDocument
              ? replaceLabel
              : label}
        </label>
      </div>

      {/* Show verification message when in verification phase */}
      {isVerifying && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Verifying document...</strong> This may take 30-60 seconds
            as we analyse the image and extract information. Please wait.
          </p>
        </div>
      )}
    </div>
  )
}
