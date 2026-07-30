'use client'

import { useState } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
})

type CreditKind = 'credits' | 'event-credits'

type EditCreditRecord = {
  id?: string
  user_id: string
  amount: string
  created_at?: string
  updated_at?: string
  username?: string
  email?: string
}

const CREDIT_EDIT_KIND_CONFIG: Record<
  CreditKind,
  {
    updatePath: string
    identifyBy: 'id' | 'user_created_at'
    title: string
    descriptionNoun: string
    amountPlaceholder: string
    successTitle: string
    successDescription: (name: string) => string
    failureFallback: string
    updateErrorFallback: string
    logSubmit: boolean
  }
> = {
  credits: {
    updatePath: '/api/admin/credits/update',
    identifyBy: 'id',
    title: 'Edit Credits',
    descriptionNoun: 'credits',
    amountPlaceholder: 'Enter credit amount',
    successTitle: 'Credits Updated',
    successDescription: name => `Successfully updated credits for ${name}`,
    failureFallback: 'Failed to update credits',
    updateErrorFallback: 'Failed to update credit',
    logSubmit: true,
  },
  'event-credits': {
    updatePath: '/api/admin/event-credits/update',
    identifyBy: 'user_created_at',
    title: 'Edit Event Credits',
    descriptionNoun: 'event credits',
    amountPlaceholder: 'Enter event credit amount',
    successTitle: 'Event Credits Updated',
    successDescription: name =>
      `Successfully updated event credits for ${name}`,
    failureFallback: 'Failed to update event credits',
    updateErrorFallback: 'Failed to update event credit',
    logSubmit: false,
  },
}

interface EditCreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void // eslint-disable-line unused-imports/no-unused-vars
  credit: EditCreditRecord
  onSuccess?: () => void
  kind?: CreditKind
}

export function EditCreditDialog({
  open, // eslint-disable-line unused-imports/no-unused-vars
  onOpenChange,
  credit,
  onSuccess,
  kind = 'credits',
}: EditCreditDialogProps) {
  const config = CREDIT_EDIT_KIND_CONFIG[kind]
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: credit.amount,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      let body: Record<string, string>
      if (config.identifyBy === 'id') {
        if (!credit.id) {
          throw new Error('Credit ID is required')
        }
        if (config.logSubmit) {
          console.log(
            'Submitting update with ID:',
            credit.id,
            'and amount:',
            values.amount
          )
        }
        body = { id: credit.id, amount: values.amount }
      } else {
        if (!credit.user_id || !credit.created_at) {
          throw new Error(
            'Missing required fields for identifying the event credit'
          )
        }
        body = {
          user_id: credit.user_id,
          created_at: credit.created_at,
          amount: values.amount,
        }
      }

      const response = await fetch(config.updatePath, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const responseData = await response.json()
      if (config.logSubmit) {
        console.log('API Response:', responseData)
      }

      if (!response.ok) {
        throw new Error(responseData.message || config.updateErrorFallback)
      }

      toast({
        title: config.successTitle,
        description: config.successDescription(credit.username || 'user'),
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(config.failureFallback + ':', error)
      toast({
        title: 'Update Failed',
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
          <DialogDescription>
            Update {config.descriptionNoun} for {credit.username || 'user'}
            {credit.email ? ` (${credit.email})` : ''}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
