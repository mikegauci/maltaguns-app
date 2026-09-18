'use client'

import { ReactNode } from 'react'
import { useIsClient } from '@/hooks/useIsClient'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FormDialogProps {
  title: string
  description: string
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  isSubmitting: boolean
  submitLabel?: string
  cancelLabel?: string
  children: ReactNode
}

export function FormDialog({
  title,
  description,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  children,
}: FormDialogProps) {
  const isMounted = useIsClient()

  if (!isMounted) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={e => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="space-y-4 py-4">{children}</div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
