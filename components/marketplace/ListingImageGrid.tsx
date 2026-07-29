'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { MAX_FILES } from '@/app/marketplace/create/constants'

type ListingImageGridProps = {
  images: string[]
  uploading?: boolean
  disabled?: boolean
  maxFiles?: number
  showAddTile?: boolean
  accept?: string
  multiple?: boolean
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  onSetPrimary: (index: number) => void
}

export function ListingImageGrid({
  images,
  uploading = false,
  disabled = false,
  maxFiles = MAX_FILES,
  showAddTile = true,
  accept = 'image/*',
  multiple = true,
  onUpload,
  onRemove,
  onSetPrimary,
}: ListingImageGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canAdd = showAddTile && images.length < maxFiles && !disabled

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {images.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="relative aspect-square rounded-md overflow-hidden border shadow-sm group"
        >
          <img
            src={url}
            alt={`Preview ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full shadow-md"
            onClick={() => onRemove(index)}
            disabled={uploading || disabled}
            aria-label="Delete image"
          >
            <X className="h-4 w-4" />
          </Button>
          {index === 0 ? (
            <span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded shadow-md">
              Main image
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSetPrimary(index)}
              disabled={uploading || disabled}
              className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity disabled:opacity-50"
            >
              Set as main
            </button>
          )}
        </div>
      ))}

      {canAdd && (
        <label className="border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer aspect-square hover:bg-muted/50 transition-colors">
          <span className="text-3xl mb-1">+</span>
          <span className="text-sm text-center text-muted-foreground px-2">
            {uploading ? 'Uploading...' : 'Add Image'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onUpload}
            disabled={uploading || disabled}
            multiple={multiple}
          />
        </label>
      )}
    </div>
  )
}
