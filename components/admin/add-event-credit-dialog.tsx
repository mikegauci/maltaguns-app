"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

// Define the form schema
const formSchema = z.object({
  user_id: z.string().min(1, "User is required"),
  amount: z.string().min(1, "Amount is required"),
})

interface Profile {
  id: string
  username?: string
  email?: string
  full_name?: string
}

interface AddEventCreditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profiles: Profile[]
  onSuccess?: () => void
}

export function AddEventCreditDialog({
  open,
  onOpenChange,
  profiles,
  onSuccess,
}: AddEventCreditDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: "",
      amount: "",
    },
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        user_id: "",
        amount: "",
      })
    }
  }, [open, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)

      // Use the admin API endpoint to create the event credit
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

      const selectedProfile = profiles.find(p => p.id === values.user_id)
      const profileName = selectedProfile?.username || selectedProfile?.email || 'user'

      toast({
        title: "Event Credits Added",
        description: `Successfully added event credits for ${profileName}`,
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Failed to add event credits:", error)
      toast({
        title: "Adding Event Credits Failed",
        description: error instanceof Error ? error.message : "Failed to add event credits",
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
          <DialogTitle>Add Event Credits</DialogTitle>
          <DialogDescription>
            Add event credits for a user
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.username || profile.email || profile.id}
                          {profile.email && profile.username ? ` (${profile.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  "Add Event Credits"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 