import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getFeatureEndDate } from '@/lib/featured-listings'
import { MAX_FILES } from '@/app/marketplace/create/constants'
import { isAllowedListingImageUrl } from '@/lib/listing-images'
import { buildListingContentUpdatePayload } from '@/lib/listing-update-payload'

type UpdateListingBody = {
  listingId: string
  title?: string
  description?: string
  price?: string | number
  type?: string
  category?: string
  subcategory?: string | null
  calibre?: string | null
  status?: string
  expires_at?: string | null
  featured?: boolean
  editable_until?: string | null
  refresh_edit_window?: boolean
  meta_title?: string | null
  meta_description?: string | null
  images?: string[]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateListingBody

    if (!body?.listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { supabaseAdmin } = auth

    const { data: existingListing, error: existingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id')
      .eq('id', body.listingId)
      .single()

    if (existingError || !existingListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (body.images !== undefined) {
      if (!Array.isArray(body.images)) {
        return NextResponse.json(
          { error: 'Invalid images. Must be an array of strings.' },
          { status: 400 }
        )
      }
      if (body.images.length > MAX_FILES) {
        return NextResponse.json(
          {
            error: `Invalid images. Maximum ${MAX_FILES} images allowed.`,
          },
          { status: 400 }
        )
      }
      if (body.images.some(url => typeof url !== 'string' || !url.trim())) {
        return NextResponse.json(
          { error: 'Invalid images. Each image must be a non-empty string.' },
          { status: 400 }
        )
      }
      const imageUrls = body.images.map(url => url.trim())
      if (imageUrls.some(url => !isAllowedListingImageUrl(url))) {
        return NextResponse.json(
          {
            error:
              'Invalid images. Only listing storage URLs or default site images are allowed.',
          },
          { status: 400 }
        )
      }
      body.images = imageUrls
    }

    const contentResult = buildListingContentUpdatePayload({
      title: body.title,
      description: body.description,
      price: body.price,
      type: body.type,
      category: body.category,
      subcategory: body.subcategory,
      calibre: body.calibre,
      images: body.images,
    })

    if (!contentResult.ok) {
      return NextResponse.json({ error: contentResult.error }, { status: 400 })
    }

    const updatePayload = contentResult.payload

    if (body.status !== undefined) updatePayload.status = body.status
    if (body.meta_title !== undefined)
      updatePayload.meta_title = body.meta_title || null
    if (body.meta_description !== undefined)
      updatePayload.meta_description = body.meta_description || null

    if (body.expires_at !== undefined) {
      if (body.expires_at === null) {
        updatePayload.expires_at = null
      } else {
        const ts = Date.parse(body.expires_at)
        if (Number.isNaN(ts)) {
          return NextResponse.json(
            { error: 'Invalid expires_at. Must be an ISO date string.' },
            { status: 400 }
          )
        }
        updatePayload.expires_at = new Date(ts).toISOString()
      }
    }

    if (body.refresh_edit_window) {
      updatePayload.editable_until = new Date(
        Date.now() + 48 * 60 * 60 * 1000
      ).toISOString()
    } else if (body.editable_until !== undefined) {
      if (body.editable_until === null) {
        updatePayload.editable_until = null
      } else {
        const ts = Date.parse(body.editable_until)
        if (Number.isNaN(ts)) {
          return NextResponse.json(
            { error: 'Invalid editable_until. Must be an ISO date string.' },
            { status: 400 }
          )
        }
        updatePayload.editable_until = new Date(ts).toISOString()
      }
    }

    const { data: updatedListing, error: updateError } = await supabaseAdmin
      .from('listings')
      .update(updatePayload)
      .eq('id', body.listingId)
      .select('*')
      .single()

    if (updateError || !updatedListing) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update listing' },
        { status: 500 }
      )
    }

    if (body.featured !== undefined) {
      if (body.featured) {
        const { data: existingFeature } = await supabaseAdmin
          .from('featured_listings')
          .select('id')
          .eq('listing_id', body.listingId)
          .maybeSingle()

        if (!existingFeature) {
          const { error: featureError } = await supabaseAdmin
            .from('featured_listings')
            .insert({
              listing_id: body.listingId,
              user_id: existingListing.seller_id,
              start_date: new Date().toISOString(),
              end_date: getFeatureEndDate().toISOString(),
            })

          if (featureError) {
            return NextResponse.json(
              {
                error: `Listing updated, but failed to feature: ${featureError.message}`,
              },
              { status: 500 }
            )
          }
        }
      } else {
        const { error: unfeatureError } = await supabaseAdmin
          .from('featured_listings')
          .delete()
          .eq('listing_id', body.listingId)

        if (unfeatureError) {
          return NextResponse.json(
            {
              error: `Listing updated, but failed to unfeature: ${unfeatureError.message}`,
            },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ success: true, listing: updatedListing })
  } catch (error) {
    console.error('[ADMIN LISTINGS UPDATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
