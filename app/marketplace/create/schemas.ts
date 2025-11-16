import * as z from 'zod'
import { MAX_FILES } from './constants'

// Base schema fields shared by both firearms and non-firearms
const baseListingFields = {
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
  price: z.coerce.number().min(1, 'Price must be at least €1'),
  images: z
    .array(z.any())
    .max(MAX_FILES, `Maximum ${MAX_FILES} images allowed`)
    .optional()
    .default([]),
}

// Firearms listing schema
export const firearmsSchema = z.object({
  category: z.enum([
    'airguns',
    'ammunition',
    'black_powder',
    'carbines',
    'crossbow',
    'pistols',
    'replica_deactivated',
    'revolvers',
    'rifles',
    'schedule_1',
    'shotguns',
  ]),
  calibre: z.string().min(1, 'Calibre is required'),
  ...baseListingFields,
})

// Non-firearms listing schema
export const nonFirearmsSchema = z.object({
  category: z.enum(['accessories', 'airsoft', 'militaria', 'reloading']),
  subcategory: z.string().min(1, 'Subcategory is required'),
  ...baseListingFields,
})

// Type exports
export type FirearmsForm = z.infer<typeof firearmsSchema>
export type NonFirearmsForm = z.infer<typeof nonFirearmsSchema>
