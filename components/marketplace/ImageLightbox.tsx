'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_FALLBACK = '/images/maltaguns-default-img.jpg'
const MIN_SCALE = 1
const MAX_SCALE = 4
const ZOOM_TOGGLE_SCALE = 2.5

interface ImageLightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: string[]
  index: number
  onIndexChange: (index: number) => void
  alt: string
}

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  index,
  onIndexChange,
  alt,
}: ImageLightboxProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [errored, setErrored] = useState(false)

  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const offsetStart = useRef({ x: 0, y: 0 })
  const movedDuringPan = useRef(false)

  const hasMultiple = images.length > 1

  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    resetZoom()
    setErrored(false)
  }, [index, resetZoom])

  useEffect(() => {
    if (!open) resetZoom()
  }, [open, resetZoom])

  const goPrev = useCallback(() => {
    if (!hasMultiple) return
    onIndexChange(index === 0 ? images.length - 1 : index - 1)
  }, [hasMultiple, index, images.length, onIndexChange])

  const goNext = useCallback(() => {
    if (!hasMultiple) return
    onIndexChange(index === images.length - 1 ? 0 : index + 1)
  }, [hasMultiple, index, images.length, onIndexChange])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, goPrev, goNext])

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setScale(prev => {
      const next = prev - e.deltaY * 0.0015 * prev
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
      if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 })
      return clamped
    })
  }

  function handleImageClick() {
    if (movedDuringPan.current) return
    if (scale > MIN_SCALE) {
      resetZoom()
    } else {
      setScale(ZOOM_TOGGLE_SCALE)
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (scale <= MIN_SCALE) return
    isPanning.current = true
    movedDuringPan.current = false
    panStart.current = { x: e.clientX, y: e.clientY }
    offsetStart.current = { ...offset }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isPanning.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedDuringPan.current = true
    setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy })
  }

  function handlePointerUp(e: React.PointerEvent) {
    isPanning.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const src = !images[index] || errored ? DEFAULT_FALLBACK : images[index]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {alt}
          </DialogPrimitive.Title>

          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            onWheel={handleWheel}
          >
            <div
              className={cn(
                'relative h-full w-full select-none',
                scale > MIN_SCALE
                  ? isPanning.current
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
                  : 'cursor-zoom-in'
              )}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: isPanning.current
                  ? 'none'
                  : 'transform 0.15s ease-out',
                touchAction: 'none',
              }}
              onClick={handleImageClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="100vw"
                className="object-contain"
                draggable={false}
                priority
                onError={() => {
                  if (src !== DEFAULT_FALLBACK) setErrored(true)
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
              <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                {index + 1} / {images.length}
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
