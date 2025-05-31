import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    const { listingId } = await request.json();
    
    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      );
    }

    // Create a Supabase client with the cookies for auth
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if the listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, status, seller_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Don't allow users to wishlist their own listings
    if (listing.seller_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot add your own listing to wishlist' },
        { status: 400 }
      );
    }

    // Check if already in wishlist
    const { data: existingWishlistItem } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .single();

    if (existingWishlistItem) {
      return NextResponse.json(
        { error: 'Item already in wishlist' },
        { status: 400 }
      );
    }

    // Add to wishlist
    const { data: wishlistItem, error: wishlistError } = await supabase
      .from('wishlist')
      .insert({
        user_id: user.id,
        listing_id: listingId
      })
      .select()
      .single();

    if (wishlistError) {
      console.error('Error adding to wishlist:', wishlistError);
      return NextResponse.json(
        { error: 'Failed to add to wishlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Added to wishlist',
      wishlistItem
    });

  } catch (error) {
    console.error('Error in wishlist add API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 