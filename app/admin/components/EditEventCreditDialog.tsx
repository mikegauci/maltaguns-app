'use client'

import { EditCreditDialog } from '@/app/admin/components/EditCreditDialog'

interface EditEventCreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  credit: {
    id?: string
    user_id: string
    amount: string
    created_at: string
    updated_at: string
    username?: string
    email?: string
  }
  onSuccess?: () => void
}

export function EditEventCreditDialog(props: EditEventCreditDialogProps) {
  return <EditCreditDialog {...props} kind="event-credits" />
}
