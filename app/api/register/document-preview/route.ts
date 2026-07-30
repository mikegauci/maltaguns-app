import { NextResponse } from 'next/server'
import {
  extractLicenseObjectPath,
  signLicenseUrl,
} from '@/lib/storage-signed-url'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const url = typeof body?.url === 'string' ? body.url : null
    const path = extractLicenseObjectPath(url)

    if (
      !path ||
      !(path.startsWith('id-cards/') || path.startsWith('licenses/'))
    ) {
      return NextResponse.json(
        { error: 'Invalid document URL' },
        { status: 400 }
      )
    }

    const previewUrl = await signLicenseUrl(url)
    if (!previewUrl) {
      return NextResponse.json(
        { error: 'Failed to create preview URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ previewUrl })
  } catch (error) {
    console.error('Error signing registration document preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
