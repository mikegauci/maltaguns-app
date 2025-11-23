'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EstablishmentInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
}

export function EstablishmentInfoDialog({
  open,
  onOpenChange,
}: EstablishmentInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Business Opportunities on MaltaGuns</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm">
          <p>
            Maltaguns provides businesses in Malta with a unique opportunity to
            showcase their services and reach a large community of firearm
            enthusiasts. Our platform is tailored to cater to professionals in
            the firearms industry, including stores, shooting clubs, ranges, and
            servicing businesses.
          </p>
          <p>
            By creating your business profile, you&apos;ll benefit from
            increased visibility, access to a niche customer base, and the
            ability to publish blog posts that highlight your expertise and
            services.
          </p>
          <p>
            Join Malta&apos;s premier firearms marketplace today and connect
            with potential customers who are passionate about shooting sports
            and firearms safety!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
