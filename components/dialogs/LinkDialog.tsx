'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'

interface LinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  linkUrl: string
  setLinkUrl: (url: string) => void // eslint-disable-line unused-imports/no-unused-vars
  openInNewTab: boolean
  setOpenInNewTab: (value: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  onApply: () => void
}

export function LinkDialog({
  open,
  onOpenChange,
  linkUrl,
  setLinkUrl,
  openInNewTab,
  setOpenInNewTab,
  onApply,
}: LinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
          <DialogDescription>
            Enter the URL and choose if it should open in a new tab
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="new-tab"
              checked={openInNewTab}
              onCheckedChange={checked => setOpenInNewTab(checked as boolean)}
            />
            <Label htmlFor="new-tab">Open in new tab</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={onApply} disabled={!linkUrl}>
            Add Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

