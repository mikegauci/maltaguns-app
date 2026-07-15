export interface ResizeImageOptions {
  maxDimension?: number
  quality?: number
  mimeType?: 'image/webp' | 'image/jpeg'
}

const DEFAULTS: Required<ResizeImageOptions> = {
  maxDimension: 1600,
  quality: 0.82,
  mimeType: 'image/webp',
}

function canUseCanvas(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  )
}

function extensionFor(mimeType: string): string {
  return mimeType === 'image/jpeg' ? 'jpg' : 'webp'
}

function withExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^./\\]+$/, '')
  return `${base || 'image'}.${ext}`
}

type Decoded =
  | { kind: 'bitmap'; image: ImageBitmap }
  | { kind: 'element'; image: HTMLImageElement; revoke: () => void }

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const image = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
      return { kind: 'bitmap', image }
    } catch {
      // Fall through to the <img> path below.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Failed to decode image'))
      el.src = url
    })
    return { kind: 'element', image, revoke: () => URL.revokeObjectURL(url) }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

function toBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality))
}

export async function resizeImageForUpload(
  file: File,
  options: ResizeImageOptions = {}
): Promise<File> {
  const { maxDimension, quality, mimeType } = { ...DEFAULTS, ...options }

  if (!canUseCanvas() || !file.type.startsWith('image/')) {
    return file
  }
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  let decoded: Decoded | null = null
  try {
    decoded = await decode(file)
    const source = decoded.image
    const width = source.width
    const height = source.height
    if (!width || !height) return file

    const scale = Math.min(1, maxDimension / Math.max(width, height))
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(source as CanvasImageSource, 0, 0, targetW, targetH)

    const blob = await toBlob(canvas, mimeType, quality)
    if (!blob) return file

    if (scale === 1 && blob.size >= file.size) return file

    return new File([blob], withExtension(file.name, extensionFor(mimeType)), {
      type: mimeType,
      lastModified: file.lastModified,
    })
  } catch (err) {
    console.error('Image resize failed; uploading original:', err)
    return file
  } finally {
    if (decoded?.kind === 'bitmap') decoded.image.close()
    if (decoded?.kind === 'element') decoded.revoke()
  }
}
