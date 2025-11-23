'use client'

import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FullscreenImageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  imageUrl: string | null
  title: string | null
}

export function FullscreenImageDialog({
  open,
  onOpenChange,
  imageUrl,
  title,
}: FullscreenImageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative w-full">
          <img
            src={imageUrl || ''}
            alt={title || 'Image'}
            className="w-full h-auto max-h-[80vh] object-contain rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
