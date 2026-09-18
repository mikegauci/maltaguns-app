import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Upload, RefreshCw, Loader2 } from 'lucide-react'

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
  const isVerifying = isUploading && uploadProgress >= 30 && uploadProgress < 90

  return (
    <>
      <Input
        type="file"
        accept={acceptedFormats}
        onChange={onChange}
        disabled={isUploading}
        className="hidden"
        id={id}
      />
      <Button
        asChild
        className={cn(
          'w-full',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <label htmlFor={id} className={cn(!isUploading && 'cursor-pointer')}>
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
      </Button>

      {isVerifying && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Verifying document...</strong> This may take 30-60 seconds
            as we analyse the image and extract information. Please wait.
          </p>
        </div>
      )}
    </>
  )
}
