'use client'

import Image from 'next/image'
import { useState } from 'react'

const DEFAULT_FALLBACK = '/images/maltaguns-default-img.jpg'

interface StorageImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  sizes?: string
  fallbackSrc?: string
  priority?: boolean
}

export function StorageImage({
  src,
  alt,
  className,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw',
  fallbackSrc = DEFAULT_FALLBACK,
  priority = false,
}: StorageImageProps) {
  const hasSrc = typeof src === 'string' && src.trim().length > 0
  const [errored, setErrored] = useState(false)
  const resolved = !hasSrc || errored ? fallbackSrc : (src as string)

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => {
        if (resolved !== fallbackSrc) setErrored(true)
      }}
    />
  )
}
