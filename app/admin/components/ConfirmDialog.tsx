'use client'

import { useIsClient } from '@/hooks/useIsClient'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  title: string
  description: string
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

export function ConfirmDialog({
  title,
  description,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
}: ConfirmDialogProps) {
  const isMounted = useIsClient()

  if (!isMounted) {
    return null
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault()
              onConfirm()
            }}
            className={
              variant === 'destructive'
                ? 'bg-destructive hover:bg-destructive/90'
                : ''
            }
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
