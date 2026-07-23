'use client'

import Image from 'next/image'
import { useState } from 'react'

const DEFAULT_FALLBACK = '/images/maltaguns-default-img.jpg'
const ALLOWED_REMOTE_HOST = 'buqeowpqufayojbitiqp.supabase.co'

interface StorageImageBaseProps {
  src: string | null | undefined
  alt: string
  className?: string
  sizes?: string
  fallbackSrc?: string
  priority?: boolean
  quality?: number
}

type StorageImageProps =
  | (StorageImageBaseProps & { width: number; height: number })
  | (StorageImageBaseProps & { width?: undefined; height?: undefined })

function isOptimizableSrc(src: string): boolean {
  if (src.startsWith('/')) return true
  try {
    return new URL(src).hostname === ALLOWED_REMOTE_HOST
  } catch {
    return false
  }
}

export function StorageImage({
  src,
  alt,
  className,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw',
  fallbackSrc = DEFAULT_FALLBACK,
  priority = false,
  width,
  height,
  quality,
}: StorageImageProps) {
  const hasSrc = typeof src === 'string' && src.trim().length > 0
  const [errored, setErrored] = useState(false)
  const resolved = !hasSrc || errored ? fallbackSrc : (src as string)
  const isFixed = typeof width === 'number' && typeof height === 'number'
  const unoptimized = !isOptimizableSrc(resolved)

  return (
    <Image
      src={resolved}
      alt={alt}
      {...(isFixed ? { width, height } : { fill: true as const })}
      sizes={sizes}
      priority={priority}
      quality={quality}
      unoptimized={unoptimized}
      className={className}
      onError={() => {
        if (resolved !== fallbackSrc) setErrored(true)
      }}
    />
  )
}
