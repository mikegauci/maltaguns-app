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

interface AddEventCreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  onSuccess?: () => void
}

export function AddEventCreditDialog({
  open, // eslint-disable-line unused-imports/no-unused-vars
  onOpenChange,
  onSuccess,
}: AddEventCreditDialogProps) {
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

      const response = await fetch(`/api/admin/event-credits/create`, {
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
        throw new Error(error.message || 'Failed to create event credit')
      }

      const profileName =
        selectedUser?.username || selectedUser?.email || 'user'

      toast({
        title: 'Event Credits Added',
        description: `Successfully added event credits for ${profileName}`,
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Failed to add event credits:', error)
      toast({
        title: 'Adding Event Credits Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to add event credits',
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
          <DialogTitle>Add Event Credits</DialogTitle>
          <DialogDescription>Add event credits for a user</DialogDescription>
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
                      placeholder="Enter event credit amount"
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
                  'Add Event Credits'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
