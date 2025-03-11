import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { listingId, userId } = await request.json();
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify user owns the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();
      
    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Unauthorized or listing not found' },
        { status: 404 }
      );
    }

    // Calculate new expiration and feature dates
    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (new Date(listing.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If listing expires in less than 15 days, extend it to 30 days
    const newExpiresAt = daysUntilExpiration <= 15 
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(listing.expires_at);

    // Set featured duration to 15 days
    const featuredUntil = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    // Update the listing
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        expires_at: newExpiresAt.toISOString(),
        featured_until: featuredUntil.toISOString()
      })
      .eq('id', listingId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: 'Listing featured successfully',
      expires_at: newExpiresAt.toISOString(),
      featured_until: featuredUntil.toISOString()
    });
  } catch (error) {
    console.error('Error featuring listing:', error);
    return NextResponse.json(
      { error: 'Failed to feature listing' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');
    const userId = searchParams.get('userId');

    if (!listingId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Verify user owns the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Unauthorized or listing not found' },
        { status: 404 }
      );
    }

    // Remove featured status
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        featured_until: null
      })
      .eq('id', listingId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: 'Feature removed successfully'
    });
  } catch (error) {
    console.error('Error removing feature:', error);
    return NextResponse.json(
      { error: 'Failed to remove feature' },
      { status: 500 }
    );
  }
} 