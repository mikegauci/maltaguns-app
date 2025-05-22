"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"

// Create a direct Supabase client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Define the form schema
const formSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
})

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

export function EditEventCreditDialog({
  open,
  onOpenChange,
  credit,
  onSuccess,
}: EditEventCreditDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Initialize form with current credit values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: credit.amount,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      
      // For credits_events, we need to use user_id and created_at to identify the record
      // since "id" is not available
      if (!credit.user_id || !credit.created_at) {
        throw new Error("Missing required fields for identifying the event credit");
      }
      
      // Use the admin API endpoint to update the event credit
      const response = await fetch(`/api/admin/event-credits/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: credit.user_id,
          created_at: credit.created_at,
          amount: values.amount,
        }),
      })
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update event credit')
      }

      toast({
        title: "Event Credits Updated",
        description: `Successfully updated event credits for ${credit.username || 'user'}`,
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Failed to update event credits:", error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update event credits",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Event Credits</DialogTitle>
          <DialogDescription>
            Update event credits for {credit.username || 'user'}{credit.email ? ` (${credit.email})` : ''}
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
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 