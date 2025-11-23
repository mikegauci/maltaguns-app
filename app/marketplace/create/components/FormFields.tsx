import { useRef } from 'react'
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
import { X } from 'lucide-react'
import { MAX_FILES } from '../constants'

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
}: ImageUploadFieldProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel>Images</FormLabel>
          <FormControl>
            <div className="space-y-4">
              <div className="flex flex-col items-start">
                <label
                  htmlFor="image-upload"
                  className={`cursor-pointer px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      uploadedImages.length >= MAX_FILES
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
                        : uploadedImages.length > 0
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                >
                  {uploadedImages.length >= MAX_FILES
                    ? 'Maximum Images Reached'
                    : uploadedImages.length > 0
                      ? 'Add More Images'
                      : 'Choose Files'}
                </label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading || uploadedImages.length >= MAX_FILES}
                  className="hidden"
                  ref={fileInputRef}
                />
              </div>
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {uploadedImages.map((url, index) => (
                    <div key={url} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(index)}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 
                                  text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Upload up to 6 images (max 5MB each). First image will be used
                as thumbnail. If no image is uploaded, a default image will be
                used.
              </p>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
