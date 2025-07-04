import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    // Calculate new dates
    const now = new Date()
    const newFeatureEndDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days
    const newListingExpiryDate = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ) // 30 days

    console.log('Renewing feature with the following dates:')
    console.log('- New feature end date:', newFeatureEndDate.toISOString())
    console.log(
      '- New listing expiry date:',
      newListingExpiryDate.toISOString()
    )

    // Update the featured_listings table
    const { error: featureError } = await supabase
      .from('featured_listings')
      .insert({
        listing_id: listingId,
        user_id: userId,
        start_date: now.toISOString(),
        end_date: newFeatureEndDate.toISOString(),
      })

    if (featureError) {
      console.error('Error updating featured_listings:', featureError)
      throw featureError
    }

    // Update the listing's expiration date
    console.log('Updating listing with ID:', listingId)

    // Update the expires_at field
    const { data: expiryUpdateResult, error: expiryUpdateError } =
      await supabase
        .from('listings')
        .update({
          expires_at: newListingExpiryDate.toISOString(),
        })
        .eq('id', listingId)
        .select('id, expires_at')

    if (expiryUpdateError) {
      console.error('Error updating expires_at:', expiryUpdateError)
      throw expiryUpdateError
    }

    console.log('Expiry update result:', expiryUpdateResult)

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 1,
        credit_type: 'featured',
        status: 'completed',
        description: `Renewed feature for listing ${listingId} for 15 days and extended expiry for 30 days`,
        type: 'debit',
      })

    if (transactionError) {
      console.error('Error recording transaction:', transactionError)
      // Non-critical error, continue
    }

    return NextResponse.json({
      success: true,
      message: 'Feature renewed successfully',
      expiresAt: newFeatureEndDate.toISOString(),
      listingExpiresAt: newListingExpiryDate.toISOString(),
    })
  } catch (error) {
    console.error('Error renewing feature:', error)
    return NextResponse.json(
      { error: 'Failed to renew feature' },
      { status: 500 }
    )
  }
}
