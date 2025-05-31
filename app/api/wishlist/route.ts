import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function GET() {
  try {
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

    // Fetch wishlist items with listing details
    const { data: wishlistItems, error: wishlistError } = await supabase
      .from('wishlist')
      .select(`
        id,
        created_at,
        listing_id,
        listings (
          id,
          title,
          description,
          price,
          category,
          subcategory,
          calibre,
          type,
          thumbnail,
          status,
          created_at,
          seller_id,
          seller:profiles!seller_id (
            username,
            is_seller
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (wishlistError) {
      console.error('Error fetching wishlist:', wishlistError);
      return NextResponse.json(
        { error: 'Failed to fetch wishlist' },
        { status: 500 }
      );
    }

    // Filter out items where listing might have been deleted
    const validWishlistItems = wishlistItems?.filter(item => item.listings) || [];

    return NextResponse.json({
      success: true,
      wishlistItems: validWishlistItems
    });

  } catch (error) {
    console.error('Error in wishlist GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 