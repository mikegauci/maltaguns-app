'use client'

import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RemoveFeatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  onConfirm: () => void
}

export function RemoveFeatureDialog({
  open,
  onOpenChange,
  onConfirm,
}: RemoveFeatureDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Feature Status</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove the featured status from this
            listing? This will not refund your feature credit.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <X className="h-4 w-4 mr-2" />
            Remove Feature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
