'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LegalWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  onConfirm: () => void
  isLoading?: boolean
}

export function LegalWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: LegalWarningDialogProps) {
  const [agreed, setAgreed] = useState(false)

  // Reset the acknowledgement whenever the dialog is closed so re-opening
  // always requires the user to check the box again.
  useEffect(() => {
    if (!open) {
      setAgreed(false)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Before you list</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Maltaguns is a marketplace only. This website holds no
            responsibility for transactions between users.
          </p>
          <p>
            You&apos;re responsible for your own safety when showing firearms to
            potential buyers. We recommend that when contacted by sellers you
            don&apos;t know, ask them to verify their licence and identity, and
            never hand over a firearm informally. Always ensure the firearms are
            cleared and safe to handle before allowing strangers to view them.
          </p>
          <p>
            All transfers must go through the official Police procedure at
            Police Headquarters, in line with the Arms Act.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Checkbox
            id="legal-agree"
            checked={agreed}
            onCheckedChange={checked => setAgreed(checked as boolean)}
            disabled={isLoading}
          />
          <Label htmlFor="legal-agree" className="text-sm font-medium">
            I understand and agree.
          </Label>
        </div>
        <DialogFooter className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={onConfirm}
            disabled={!agreed || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              'Agree & Publish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
