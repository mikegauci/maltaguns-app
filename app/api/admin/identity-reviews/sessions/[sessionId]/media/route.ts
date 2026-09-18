import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import {
  fetchDiditSessionDecisionCached,
  formatDiditApiError,
  isIdentityReviewMediaKind,
  resolveMediaUrlFromDecision,
} from '@/lib/didit-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ sessionId: string }> }
) {
  try {
    const params = await props.params
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') ?? 'front'

    if (!isIdentityReviewMediaKind(kind)) {
      return NextResponse.json({ error: 'Invalid media kind' }, { status: 400 })
    }

    const remote = await fetchDiditSessionDecisionCached(params.sessionId)
    const mediaUrl = resolveMediaUrlFromDecision(remote.decision, kind)

    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'Media not available' },
        { status: 404 }
      )
    }

    const mediaResponse = await fetch(mediaUrl)

    if (!mediaResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch media from Didit' },
        { status: 502 }
      )
    }

    const contentType =
      mediaResponse.headers.get('content-type') ?? 'application/octet-stream'
    const buffer = await mediaResponse.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=120',
      },
    })
  } catch (error) {
    console.error('Error proxying session media:', error)
    return NextResponse.json(
      { error: formatDiditApiError(error) },
      { status: 500 }
    )
  }
}
