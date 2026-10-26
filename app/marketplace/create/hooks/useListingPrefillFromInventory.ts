'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { UseFormReturn } from 'react-hook-form'
import {
  buildFirearmsPrefill,
  buildNonFirearmsPrefill,
} from '@/lib/marketplace/prefill-from-personal-item'
import type { FirearmsForm, NonFirearmsForm } from '../schemas'

type PrefillKind = 'firearms' | 'non-firearms'

type UseListingPrefillOptions<T extends FirearmsForm | NonFirearmsForm> = {
  kind: PrefillKind
  form: UseFormReturn<T>
  setImages: (images: string[]) => void
  ready?: boolean
  allowedCategoryKeys?: string[]
}

export function useListingPrefillFromInventory<
  T extends FirearmsForm | NonFirearmsForm,
>({
  kind,
  form,
  setImages,
  ready = true,
  allowedCategoryKeys,
}: UseListingPrefillOptions<T>) {
  const searchParams = useSearchParams()
  const inventoryItemId = searchParams.get('inventoryItem')
  const appliedRef = useRef(false)
  const [isPrefilling, setIsPrefilling] = useState(!!inventoryItemId)

  useEffect(() => {
    if (!inventoryItemId || !ready || appliedRef.current) return

    let cancelled = false

    async function loadPrefill() {
      setIsPrefilling(true)
      try {
        const res = await fetch(`/api/armory/personal-items/${inventoryItemId}`)
        if (!res.ok) return
        const data = await res.json()
        const item = data.item
        if (!item || cancelled) return

        if (kind === 'firearms') {
          const prefill = buildFirearmsPrefill(item, allowedCategoryKeys)
          form.reset({
            ...form.getValues(),
            ...prefill,
          } as T)
          if (prefill.images?.length) setImages(prefill.images)
        } else {
          const prefill = buildNonFirearmsPrefill(item)
          form.reset({
            ...form.getValues(),
            ...prefill,
          } as T)
          if (prefill.images?.length) setImages(prefill.images)
        }

        appliedRef.current = true
      } finally {
        if (!cancelled) setIsPrefilling(false)
      }
    }

    loadPrefill()
    return () => {
      cancelled = true
    }
  }, [inventoryItemId, ready, kind, form, setImages, allowedCategoryKeys])

  return { inventoryItemId, isPrefilling }
}
