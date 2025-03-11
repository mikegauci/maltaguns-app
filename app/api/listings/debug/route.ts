import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { listingId } = await request.json();
    
    // Initialize Supabase client with admin privileges
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current date
    const now = new Date();
    const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    console.log(`Debug API: Directly updating listing ${listingId} to expires_at ${future30Days.toISOString()}`);
    
    // Check if the listing exists
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();
      
    if (listingError) {
      console.error('Error getting listing:', listingError);
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    
    console.log('Current listing data - expires_at:', listing.expires_at);
    
    // Update the expires_at field directly
    const { data: updateResult, error: updateError } = await supabase
      .from('listings')
      .update({
        expires_at: future30Days.toISOString()
      })
      .eq('id', listingId)
      .select('id, expires_at');
    
    if (updateError) {
      console.error('Error updating expires_at:', updateError);
      
      // Try a more direct approach using RPC if available
      try {
        console.log('Attempting alternative update method');
        
        // Try updating via raw query if possible
        const { error: updateAttempt2Error } = await supabase
          .rpc('force_update_expiry', {
            p_listing_id: listingId,
            p_new_expires_at: future30Days.toISOString()
          });
          
        if (updateAttempt2Error) {
          console.error('Second attempt failed:', updateAttempt2Error);
          return NextResponse.json({ 
            error: 'Failed to update expires_at after multiple attempts',
            details: [updateError, updateAttempt2Error]  
          }, { status: 500 });
        }
        
        console.log('Second attempt may have succeeded');
        
        // Try to fetch the updated listing
        const { data: checkResult } = await supabase
          .from('listings')
          .select('id, expires_at')
          .eq('id', listingId)
          .single();
          
        console.log('Current listing data after attempt 2:', checkResult);
        
        return NextResponse.json({
          success: true,
          message: 'Expiry date may have been updated via alternative method',
          originalListing: listing,
          updatedListing: checkResult
        });
      } catch (alternativeError) {
        console.error('Alternative approach failed:', alternativeError);
        return NextResponse.json({ 
          error: 'All update attempts failed',
          details: [updateError, alternativeError]  
        }, { status: 500 });
      }
    }
    
    console.log('Update result:', updateResult);
    
    return NextResponse.json({
      success: true,
      message: 'Expiry date successfully updated',
      originalExpiryDate: listing.expires_at,
      newExpiryDate: updateResult?.[0]?.expires_at,
    });
  } catch (error) {
    console.error('Unexpected error in debug API:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
} 