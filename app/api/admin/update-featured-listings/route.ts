import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    // Execute raw SQL to drop the constraint on featured_listings if it exists
    const { error: dropFeaturedError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE featured_listings DROP CONSTRAINT IF EXISTS featured_listings_listing_id_key',
    })

    if (dropFeaturedError) {
      console.error(
        'Error dropping featured_listings constraint:',
        dropFeaturedError
      )
      return NextResponse.json(
        {
          error: 'Failed to drop featured_listings constraint',
          details: dropFeaturedError,
        },
        { status: 500 }
      )
    }

    // Execute raw SQL to add the new constraint to featured_listings
    const { error: addFeaturedError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE featured_listings ADD CONSTRAINT IF NOT EXISTS featured_listings_listing_id_user_id_key UNIQUE (listing_id, user_id)',
    })

    if (addFeaturedError) {
      console.error(
        'Error adding new featured_listings constraint:',
        addFeaturedError
      )
      return NextResponse.json(
        {
          error: 'Failed to add new featured_listings constraint',
          details: addFeaturedError,
        },
        { status: 500 }
      )
    }

    // Drop the unique constraint on credits_featured.user_id if it exists
    const { error: dropCreditsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE credits_featured DROP CONSTRAINT IF EXISTS credits_featured_user_id_key',
    })

    if (dropCreditsError) {
      console.error(
        'Error dropping credits_featured constraint:',
        dropCreditsError
      )
      // Continue with the process, as this is not critical
    }

    return NextResponse.json({
      success: true,
      message:
        'Database updated successfully to allow multiple featured listings',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error },
      { status: 500 }
    )
  }
}
