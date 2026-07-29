'use client'

import { AddCreditDialog } from '@/app/admin/components/AddCreditDialog'

interface AddEventCreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  onSuccess?: () => void
}

export function AddEventCreditDialog(props: AddEventCreditDialogProps) {
  return <AddCreditDialog {...props} kind="event-credits" />
}
