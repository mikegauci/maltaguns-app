'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Loader2 } from 'lucide-react'
import { nonFirearmsCategories, nonFirearmsSubcategories } from '../constants'
import { nonFirearmsSchema, NonFirearmsForm } from '../schemas'
import { useImageUpload } from '../hooks/useImageUpload'
import { useAuthSession } from '../hooks/useAuthSession'
import { createListingHandlers } from '../handlers/listingHandlers'
import { ListingFormLayout } from '@/components/marketplace/ListingFormLayout'
import { ListingFormSection } from '@/components/marketplace/ListingFormSection'
import {
  TitleField,
  DescriptionField,
  PriceField,
  ImageUploadField,
} from '@/components/marketplace/FormFields'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'

export default function CreateNonFirearmsListing() {
  const router = useRouter()
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] =
    useState<keyof typeof nonFirearmsSubcategories>('airsoft')

  const form = useForm<NonFirearmsForm>({
    resolver: zodResolver(nonFirearmsSchema),
    defaultValues: {
      category: 'airsoft',
      subcategory: '',
      title: '',
      description: '',
      price: 0,
      images: [],
    },
  })

  // Use shared hooks
  const { isLoading } = useAuthSession()
  const {
    uploadedImages,
    uploading,
    handleImageUpload,
    handleDeleteImage,
    handleSetPrimaryImage,
  } = useImageUpload({ toast, setValue: form.setValue })

  // Create handlers
  const { createNonFirearmsListing } = createListingHandlers({
    supabase,
    router,
    toast,
    setIsSubmitting,
  })

  async function onSubmit(data: NonFirearmsForm) {
    await createNonFirearmsListing(data)
  }

  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader
          align="center"
          backHref="/marketplace/create"
          title="Create Non-Firearms Listing"
          description="List accessories, equipment, and related items for sale"
          className="mb-6"
        />
        <p className="text-center text-muted-foreground">Loading...</p>
      </PageLayout>
    )
  }

  return (
    <ListingFormLayout
      title="Create Non-Firearms Listing"
      description="List accessories, equipment, and related items for sale"
      backHref="/marketplace/create"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ListingFormSection title="Details" first>
            <TitleField control={form.control} name="title" />
            <DescriptionField control={form.control} name="description" />
            <PriceField control={form.control} name="price" />
          </ListingFormSection>

          <ListingFormSection title="Classification">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={value => {
                        field.onChange(value)
                        setSelectedCategory(
                          value as keyof typeof nonFirearmsSubcategories
                        )
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(nonFirearmsCategories).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subcategory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(
                          nonFirearmsSubcategories[selectedCategory]
                        ).map(([value, label]) => (
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
            </div>
          </ListingFormSection>

          <ListingFormSection title="Photos">
            <ImageUploadField
              control={form.control}
              name="images"
              uploadedImages={uploadedImages}
              uploading={uploading}
              handleImageUpload={handleImageUpload}
              handleDeleteImage={handleDeleteImage}
              handleSetPrimaryImage={handleSetPrimaryImage}
            />
          </ListingFormSection>

          <div className="border-t border-border pt-6">
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isSubmitting || uploading}
            >
              {isSubmitting || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading Images...' : 'Creating...'}
                </>
              ) : (
                'Create Listing'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </ListingFormLayout>
  )
}
