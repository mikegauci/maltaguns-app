'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'

interface ImageAltDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  imageAltText: string
  setImageAltText: (text: string) => void // eslint-disable-line unused-imports/no-unused-vars
  isEditingExistingImage: boolean
  selectedImage: { src: string; alt: string } | null
  uploadingContentImage: boolean
  onInsert: () => void
  onCancel: () => void
}

export function ImageAltDialog({
  open,
  onOpenChange,
  imageAltText,
  setImageAltText,
  isEditingExistingImage,
  selectedImage,
  uploadingContentImage,
  onInsert,
  onCancel,
}: ImageAltDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditingExistingImage
              ? 'Edit Image Alt Text'
              : 'Add Image Alt Text'}
          </DialogTitle>
          <DialogDescription>
            Enter alternative text to describe the image for accessibility
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="alt-text">Alt Text</Label>
            <Input
              id="alt-text"
              value={imageAltText}
              onChange={e => setImageAltText(e.target.value)}
              placeholder="Describe the image"
            />
          </div>
          {isEditingExistingImage && selectedImage && (
            <div className="relative w-full aspect-video">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="rounded-md object-contain w-full h-full"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={onInsert}
            disabled={
              !imageAltText ||
              (!isEditingExistingImage && uploadingContentImage)
            }
          >
            {!isEditingExistingImage && uploadingContentImage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : isEditingExistingImage ? (
              'Update Alt Text'
            ) : (
              'Insert Image'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
