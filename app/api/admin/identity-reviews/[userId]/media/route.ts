import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import {
  fetchDiditSessionDecisionCached,
  formatDiditApiError,
  isIdentityReviewMediaKind,
  resolveMediaUrlFromDecision,
  sessionVendorDataMatchesUser,
} from '@/lib/didit-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind')
    const sessionId = searchParams.get('sessionId')

    if (!isIdentityReviewMediaKind(kind)) {
      return NextResponse.json({ error: 'Invalid media kind' }, { status: 400 })
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const remote = await fetchDiditSessionDecisionCached(sessionId)

    if (!sessionVendorDataMatchesUser(remote.decision, params.userId)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

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
    console.error('Error proxying identity review media:', error)
    return NextResponse.json(
      { error: formatDiditApiError(error) },
      { status: 500 }
    )
  }
}
