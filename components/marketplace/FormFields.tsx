import { Control, FieldValues, Path } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { ListingImageGrid } from '@/components/marketplace/ListingImageGrid'
import { MAX_FILES } from '../../app/marketplace/create/constants'

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
}

interface ImageUploadFieldProps<T extends FieldValues>
  extends FormFieldProps<T> {
  uploadedImages: string[]
  uploading: boolean
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void // eslint-disable-line unused-imports/no-unused-vars
  handleDeleteImage: (index: number) => void // eslint-disable-line unused-imports/no-unused-vars
  handleSetPrimaryImage: (index: number) => void // eslint-disable-line unused-imports/no-unused-vars
}

export function TitleField<T extends FieldValues>({
  control,
  name,
}: FormFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Title</FormLabel>
          <FormControl>
            <Input placeholder="Enter a descriptive title" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function DescriptionField<T extends FieldValues>({
  control,
  name,
}: FormFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Provide detailed information about the item"
              className="min-h-[120px]"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function PriceField<T extends FieldValues>({
  control,
  name,
}: FormFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { onChange, value, ...fieldProps } }) => (
        <FormItem>
          <FormLabel>Price (€)</FormLabel>
          <FormControl>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Enter price"
              onChange={e => {
                const inputValue = e.target.value
                if (inputValue === '') {
                  onChange(0)
                  return
                }
                const cleanedValue = inputValue.replace(/^0+(?=\d)/, '')
                e.target.value = cleanedValue
                const parsed = parseFloat(cleanedValue)
                if (!isNaN(parsed)) {
                  onChange(parsed)
                }
              }}
              value={value === 0 ? '' : value}
              {...fieldProps}
            />
          </FormControl>
          <FormMessage />
          <FormDescription>Price must be at least €1</FormDescription>
        </FormItem>
      )}
    />
  )
}

export function ImageUploadField<T extends FieldValues>({
  control,
  name,
  uploadedImages,
  uploading,
  handleImageUpload,
  handleDeleteImage,
  handleSetPrimaryImage,
}: ImageUploadFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel>Images</FormLabel>
          <FormControl>
            <div className="space-y-4">
              <ListingImageGrid
                images={uploadedImages}
                uploading={uploading}
                maxFiles={MAX_FILES}
                onUpload={handleImageUpload}
                onRemove={handleDeleteImage}
                onSetPrimary={handleSetPrimaryImage}
              />
              <p className="text-sm text-muted-foreground">
                Upload up to{" "}{MAX_FILES}{" "}images (max 5MB each). Tap &quot;Set as
                main&quot; to choose the display image shown on listings. If no
                image is uploaded, a default image will be used.
              </p>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
