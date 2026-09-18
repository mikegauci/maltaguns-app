'use client'

import { AddCreditDialog } from '@/app/admin/components/AddCreditDialog'

interface AddEventCreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddEventCreditDialog(props: AddEventCreditDialogProps) {
  return <AddCreditDialog {...props} kind="event-credits" />
}
