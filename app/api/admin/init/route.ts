import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    return NextResponse.json({
      success: true,
      message: 'Admin status is now controlled directly via the database',
    })
  } catch (error) {
    console.error('Error in admin init endpoint:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
