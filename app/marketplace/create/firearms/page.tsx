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
import { CreditDialog } from '@/components/dialogs'
import { firearmsCategories } from '../constants'
import { firearmsSchema, FirearmsForm } from '../schemas'
import { useImageUpload } from '../hooks/useImageUpload'
import { useAuthSession } from '../hooks/useAuthSession'
import { useCredits } from '../hooks/useCredits'
import { createListingHandlers } from '../handlers/listingHandlers'
import { ListingFormLayout } from '../../../../components/marketplace/ListingFormLayout'
import {
  TitleField,
  DescriptionField,
  PriceField,
  ImageUploadField,
} from '../../../../components/marketplace/FormFields'
import { getAllowedCategories, LicenseTypes } from '@/lib/license-utils'
import { PageLayout } from '@/components/ui/page-layout'

export default function CreateFirearmsListing() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allowedCategories, setAllowedCategories] = useState<string[]>([])
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(true)

  const form = useForm<FirearmsForm>({
    resolver: zodResolver(firearmsSchema),
    defaultValues: {
      category: 'replica_deactivated',
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

  // Fetch user's license types and determine allowed categories
  useEffect(() => {
    async function fetchUserLicenseTypes() {
      if (!userId) return

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('license_types')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Error fetching license types:', error)
          setAllowedCategories([])
          return
        }

        const licenseTypes = profile?.license_types as LicenseTypes | null
        const allowed = getAllowedCategories(licenseTypes)
        setAllowedCategories(allowed)

        // Set default category to the first allowed category
        if (allowed.length > 0) {
          // Find the first matching category key from firearmsCategories
          const firstAllowedCategory = Object.entries(firearmsCategories).find(
            ([_, label]) => allowed.includes(label)
          )
          if (firstAllowedCategory) {
            form.setValue(
              'category',
              firstAllowedCategory[0] as FirearmsForm['category']
            )
          }
        }
      } catch (error) {
        console.error('Error:', error)
        setAllowedCategories([])
      } finally {
        setIsLoadingLicenses(false)
      }
    }

    if (!isLoading && userId) {
      fetchUserLicenseTypes()
    }
  }, [isLoading, userId, supabase, form])

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

  if (isLoading || isLoadingLicenses) {
    return (
      <PageLayout centered>
        <p className="text-muted-foreground">Loading...</p>
      </PageLayout>
    )
  }

  // Check if user has no allowed categories
  if (allowedCategories.length === 0) {
    return (
      <PageLayout centered className="p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">No License Detected</h2>
          <p className="text-muted-foreground">
            You need a verified firearms license to create firearms listings.
            Please upload your license in your profile to get started.
          </p>
          <Button onClick={() => router.push('/profile')}>Go to Profile</Button>
        </div>
      </PageLayout>
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
                        .filter(([value, label]) => {
                          // Filter by allowed categories based on user's license
                          if (!allowedCategories.includes(label)) {
                            return false
                          }
                          // Additionally filter ammunition for non-retailers
                          return value !== 'ammunition' || isRetailer
                        })
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
