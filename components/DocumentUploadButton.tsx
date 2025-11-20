import { Input } from '@/components/ui/input'
import { Upload, RefreshCw } from 'lucide-react'

interface DocumentUploadButtonProps {
  id: string
  label: string
  replaceLabel: string
  isUploading: boolean
  uploadProgress: number
  hasExistingDocument: boolean
  acceptedFormats?: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
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
  return (
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
        {hasExistingDocument ? (
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
  )
}
