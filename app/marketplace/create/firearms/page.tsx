'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'
import { CreditDialog } from '@/components/credit-dialog'

// Import shared modules
import { firearmsCategories } from '../constants'
import { firearmsSchema, FirearmsForm } from '../schemas'
import { useImageUpload } from '../hooks/useImageUpload'
import { useAuthSession } from '../hooks/useAuthSession'
import { useCredits } from '../hooks/useCredits'
import { createListingHandlers } from '../handlers/listingHandlers'
import { ListingFormLayout } from '../components/ListingFormLayout'
import {
  TitleField,
  DescriptionField,
  PriceField,
  ImageUploadField,
} from '../components/FormFields'

export default function CreateFirearmsListing() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FirearmsForm>({
    resolver: zodResolver(firearmsSchema),
    defaultValues: {
      category: 'airguns',
      calibre: '',
      title: '',
      description: '',
      price: 0,
      images: [],
    },
  })

  // Use shared hooks
  const { isLoading, userId, isRetailer } = useAuthSession()
  const { credits, setCredits, hasCredits, checkCredits } = useCredits()
  const { uploadedImages, uploading, handleImageUpload, handleDeleteImage } =
    useImageUpload({ toast, setValue: form.setValue })

  // Create handlers
  const { createFirearmsListing } = createListingHandlers({
    supabase,
    router,
    toast,
    setIsSubmitting,
  })

  useEffect(() => {
    if (!isLoading && userId) {
      checkCredits(isRetailer).then(currentCredits => {
        if (currentCredits === 0 && !isRetailer) {
          setShowCreditDialog(true)
        }
      })
    }
  }, [isLoading, userId, isRetailer, checkCredits])

  async function onSubmit(data: FirearmsForm) {
    if (credits < 1) {
      setShowCreditDialog(true)
      return
    }

    await createFirearmsListing({
      ...data,
      credits,
      setCredits,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <ListingFormLayout
        title="Create Firearms Listing"
        description="List your firearm for sale on the marketplace"
        credits={credits}
        showCredits
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(firearmsCategories)
                        .filter(
                          ([value]) => value !== 'ammunition' || isRetailer
                        )
                        .map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
              name="calibre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calibre</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 9mm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <TitleField control={form.control} name="title" />
            <DescriptionField control={form.control} name="description" />
            <PriceField control={form.control} name="price" />
            <ImageUploadField
              control={form.control}
              name="images"
              uploadedImages={uploadedImages}
              uploading={uploading}
              handleImageUpload={handleImageUpload}
              handleDeleteImage={handleDeleteImage}
            />

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={isSubmitting || uploading || !hasCredits}
            >
              {isSubmitting || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading Images...' : 'Creating...'}
                </>
              ) : !hasCredits ? (
                'Insufficient Credits'
              ) : (
                'Create Listing'
              )}
            </Button>
          </form>
        </Form>
      </ListingFormLayout>

      {userId && (
        <CreditDialog
          open={showCreditDialog}
          onOpenChange={open => {
            setShowCreditDialog(open)
            if (!open && credits === 0 && !isRetailer) {
              router.push('/marketplace/create')
            }
          }}
          userId={userId}
          source="marketplace"
          onSuccess={() => {
            checkCredits(isRetailer)
            setShowCreditDialog(false)
          }}
        />
      )}
    </>
  )
}
