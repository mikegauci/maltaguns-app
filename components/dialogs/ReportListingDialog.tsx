'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Flag } from 'lucide-react'

interface ReportListingDialogProps {
  listingId: string
}

const reportReasons = [
  { value: 'illegal_item', label: 'Illegal item' },
  { value: 'incorrect_category', label: 'Incorrect category' },
  { value: 'false_pricing', label: 'False pricing' },
  { value: 'false_description', label: 'False description/keywords' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'multiple_item_listings', label: 'Multiple item listings' },
  { value: 'item_already_sold', label: 'Item already sold' },
  { value: 'seller_not_available', label: 'Seller not available' },
]

export function ReportListingDialog({ listingId }: ReportListingDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: 'Error',
        description: 'Please select a reason for reporting',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        toast({
          title: 'Error',
          description: 'You must be logged in to report a listing',
          variant: 'destructive',
        })
        router.push('/login')
        return
      }

      const { error } = await supabase.from('reported_listings').insert({
        listing_id: listingId,
        reporter_id: session.user.id,
        reason,
        description: description.trim() || null,
      })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Listing has been reported successfully',
      })
      setOpen(false)
      setReason('')
      setDescription('')
    } catch (error) {
      console.error('Error reporting listing:', error)
      toast({
        title: 'Error',
        description: 'Failed to report listing. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Flag className="h-4 w-4 mr-2" />
          Report Listing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Listing</DialogTitle>
          <DialogDescription>
            Please select a reason for reporting this listing and provide
            additional details if necessary.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Additional Details (Optional)
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide more information about why you are reporting this listing..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
