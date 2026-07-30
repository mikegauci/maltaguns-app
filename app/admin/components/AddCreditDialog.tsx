'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AdminUserPicker } from '@/app/admin/components/AdminUserPicker'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { AdminSearchUser } from '@/lib/admin-user-types'

const formSchema = z.object({
  user_id: z.string().min(1, 'User is required'),
  amount: z.string().min(1, 'Amount is required'),
})

type CreditKind = 'credits' | 'event-credits'

const CREDIT_KIND_CONFIG: Record<
  CreditKind,
  {
    createPath: string
    title: string
    description: string
    amountPlaceholder: string
    submitLabel: string
    successTitle: string
    successDescription: (name: string) => string
    failureTitle: string
    failureFallback: string
    createErrorFallback: string
  }
> = {
  credits: {
    createPath: '/api/admin/credits/create',
    title: 'Add Credits',
    description: 'Add credits for a user',
    amountPlaceholder: 'Enter credit amount',
    submitLabel: 'Add Credits',
    successTitle: 'Credits Added',
    successDescription: name => `Successfully added credits for ${name}`,
    failureTitle: 'Adding Credits Failed',
    failureFallback: 'Failed to add credits',
    createErrorFallback: 'Failed to create credit',
  },
  'event-credits': {
    createPath: '/api/admin/event-credits/create',
    title: 'Add Event Credits',
    description: 'Add event credits for a user',
    amountPlaceholder: 'Enter event credit amount',
    submitLabel: 'Add Event Credits',
    successTitle: 'Event Credits Added',
    successDescription: name => `Successfully added event credits for ${name}`,
    failureTitle: 'Adding Event Credits Failed',
    failureFallback: 'Failed to add event credits',
    createErrorFallback: 'Failed to create event credit',
  },
}

interface AddCreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  onSuccess?: () => void
  kind?: CreditKind
}

export function AddCreditDialog({
  open, // eslint-disable-line unused-imports/no-unused-vars
  onOpenChange,
  onSuccess,
  kind = 'credits',
}: AddCreditDialogProps) {
  const config = CREDIT_KIND_CONFIG[kind]
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminSearchUser | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: '',
      amount: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        user_id: '',
        amount: '',
      })
      setSelectedUser(null)
    }
  }, [open, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      const response = await fetch(config.createPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: values.user_id,
          amount: values.amount,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || config.createErrorFallback)
      }

      const profileName =
        selectedUser?.username || selectedUser?.email || 'user'

      toast({
        title: config.successTitle,
        description: config.successDescription(profileName),
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(config.failureFallback + ':', error)
      toast({
        title: config.failureTitle,
        description:
          error instanceof Error ? error.message : config.failureFallback,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>User</FormLabel>
                  <FormControl>
                    <AdminUserPicker
                      value={field.value}
                      onChange={field.onChange}
                      onUserSelect={setSelectedUser}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={config.amountPlaceholder}
                      {...field}
                      type="number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  config.submitLabel
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
