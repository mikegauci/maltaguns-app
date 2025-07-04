import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { listingId, userId } = await request.json()
    console.log(
      `[FEATURE-API] Featuring listing ${listingId} for user ${userId}`
    )

    const supabase = createRouteHandlerClient({ cookies })

    // Verify user owns the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single()

    if (listingError || !listing) {
      console.error(
        '[FEATURE-API] Listing not found or not authorized:',
        listingError
      )
      return NextResponse.json(
        { error: 'Unauthorized or listing not found' },
        { status: 404 }
      )
    }

    console.log('[FEATURE-API] Listing found:', listing.id, listing.title)

    // Calculate new expiration and feature dates
    const now = new Date()
    const daysUntilExpiration = Math.ceil(
      (new Date(listing.expires_at).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    )

    // If listing expires in less than 15 days, extend it to 30 days
    const newExpiresAt =
      daysUntilExpiration <= 15
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(listing.expires_at)

    // Set featured duration to 15 days
    const featureEndDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
    console.log('[FEATURE-API] Setting expiration dates:')
    console.log('- Listing expiry:', newExpiresAt.toISOString())
    console.log('- Feature until:', featureEndDate.toISOString())

    // Update the listing - only update expires_at, not featured_until
    console.log('[FEATURE-API] Updating listing expiry date')
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', listingId)

    if (updateError) {
      console.error('[FEATURE-API] Error updating listing:', updateError)
      throw updateError
    }

    console.log('[FEATURE-API] Listing expiry date updated successfully')

    // First check if the listing is already featured
    console.log('[FEATURE-API] Checking if listing is already featured')
    const { data: existingFeature, error: checkError } = await supabase
      .from('featured_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('user_id', userId)
      .gt('end_date', now.toISOString())
      .maybeSingle()

    if (checkError) {
      console.error(
        '[FEATURE-API] Error checking existing feature:',
        checkError
      )
      // Continue anyway, will try to create new feature
    }

    if (existingFeature) {
      console.log(
        '[FEATURE-API] Listing is already featured, updating end date'
      )

      // Update the existing feature
      const { error: updateFeatureError } = await supabase
        .from('featured_listings')
        .update({
          end_date: featureEndDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existingFeature.id)

      if (updateFeatureError) {
        console.error(
          '[FEATURE-API] Error updating existing feature:',
          updateFeatureError
        )
        throw updateFeatureError
      }

      console.log('[FEATURE-API] Existing feature updated successfully')
    } else {
      // Insert into featured_listings table
      console.log('[FEATURE-API] Adding new entry to featured_listings table')

      const insertData = {
        listing_id: listingId,
        user_id: userId,
        start_date: now.toISOString(),
        end_date: featureEndDate.toISOString(),
      }

      console.log('[FEATURE-API] Insert data:', insertData)

      const { data: newFeature, error: featuredError } = await supabase
        .from('featured_listings')
        .insert(insertData)
        .select()

      if (featuredError) {
        console.error(
          '[FEATURE-API] Error creating featured listing entry:',
          featuredError
        )
        throw featuredError
      }

      console.log('[FEATURE-API] New feature created successfully:', newFeature)
    }

    return NextResponse.json({
      message: 'Listing featured successfully',
      expires_at: newExpiresAt.toISOString(),
      feature_end_date: featureEndDate.toISOString(),
    })
  } catch (error) {
    console.error('Error featuring listing:', error)
    return NextResponse.json(
      { error: 'Failed to feature listing', details: error },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { listingId, userId } = await request.json()

    const supabase = createRouteHandlerClient({ cookies })

    // Verify user owns the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Unauthorized or listing not found' },
        { status: 404 }
      )
    }

    // Check for entries in featured_listings
    const { data: featuredData, error: featuredCheckError } = await supabase
      .from('featured_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('user_id', userId)

    if (featuredCheckError) {
      console.error(
        `[FEATURE-API] Error checking featured_listings:`,
        featuredCheckError
      )
      // Continue despite this error
    } else if (featuredData && featuredData.length > 0) {
      console.log(
        `[FEATURE-API] Found entries in featured_listings to delete:`,
        featuredData.length
      )

      // Delete from featured_listings table
      const { error: deleteError } = await supabase
        .from('featured_listings')
        .delete()
        .eq('listing_id', listingId)
        .eq('user_id', userId)

      if (deleteError) {
        console.error(
          `[FEATURE-API] Error deleting from featured_listings:`,
          deleteError
        )
        // Continue despite this error
      } else {
        console.log(`[FEATURE-API] Successfully deleted from featured_listings`)
      }
    } else {
      console.log(`[FEATURE-API] No entries found in featured_listings`)
    }

    console.log(
      `[FEATURE-API] Successfully removed feature status for listing ${listingId}`
    )

    return NextResponse.json({
      message: 'Feature removed successfully',
    })
  } catch (error) {
    console.error('Error removing feature:', error)
    return NextResponse.json(
      { error: 'Failed to remove feature', details: error },
      { status: 500 }
    )
  }
}
