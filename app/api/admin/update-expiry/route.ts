import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  console.log('[ADMIN-API] Starting update-expiry endpoint request');
  
  try {
    // Extract listingId from request body
    const { listingId } = await request.json();
    
    if (!listingId) {
      console.error('[ADMIN-API] No listingId provided');
      return NextResponse.json(
        { error: 'Missing listingId' },
        { status: 400 }
      );
    }
    
    console.log(`[ADMIN-API] Attempting to update expiry for listing: ${listingId}`);
    
    // First, check if the listing exists
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, expires_at')
      .eq('id', listingId)
      .single();
      
    if (listingError) {
      console.error(`[ADMIN-API] Error fetching listing: ${listingError.message}`);
      return NextResponse.json(
        { error: `Error fetching listing: ${listingError.message}` },
        { status: 500 }
      );
    }
    
    if (!listing) {
      console.error(`[ADMIN-API] Listing not found: ${listingId}`);
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    console.log(`[ADMIN-API] Current expires_at: ${listing.expires_at}`);
    
    // Calculate new expiry date (30 days from now)
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    const newExpiryIso = newExpiryDate.toISOString();
    
    console.log(`[ADMIN-API] New expires_at will be: ${newExpiryIso}`);
    
    // Update the listing with the new expiry date using the admin client (bypasses RLS)
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        expires_at: newExpiryIso
      })
      .eq('id', listingId)
      .select('id, expires_at');
      
    if (updateError) {
      console.error(`[ADMIN-API] Error updating expiry: ${updateError.message}`);
      console.error(`[ADMIN-API] Error details:`, updateError);
      return NextResponse.json(
        { error: `Failed to update expiry: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    if (!updateData || updateData.length === 0) {
      console.error(`[ADMIN-API] No rows updated`);
      return NextResponse.json(
        { error: 'No rows updated' },
        { status: 500 }
      );
    }
    
    console.log(`[ADMIN-API] Successfully updated expires_at for listing ${listingId}`);
    console.log(`[ADMIN-API] Update result:`, updateData);
    
    return NextResponse.json({
      success: true,
      message: 'Listing expiry updated successfully',
      listing: updateData[0]
    });
  } catch (error: any) {
    console.error(`[ADMIN-API] Unexpected error: ${error.message}`);
    console.error(`[ADMIN-API] Error details:`, error);
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    );
  }
} 