import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { userId, listingId } = await request.json();

    if (!userId || !listingId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("[AUTO-FEATURE API] Auto-featuring listing:", listingId, "for user:", userId);

    // Check if this listing is already featured by this user
    const now = new Date().toISOString();
    const { data: existingFeature, error: checkError } = await supabaseAdmin
      .from("featured_listings")
      .select("*")
      .eq("listing_id", listingId)
      .eq("user_id", userId)
      .gt("end_date", now)
      .maybeSingle();

    if (checkError) {
      console.error("[AUTO-FEATURE API] Error checking existing feature:", checkError);
      return NextResponse.json(
        { error: "Failed to check if listing is already featured" },
        { status: 500 }
      );
    }

    if (existingFeature) {
      console.log("[AUTO-FEATURE API] Listing is already featured");
      return NextResponse.json({ 
        success: true,
        message: "Listing was already featured",
        alreadyFeatured: true
      });
    }

    // Calculate start and end dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 15); // 15 days

    // Check if listing needs expiry extension
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("expires_at")
      .eq("id", listingId)
      .single();

    if (listingError) {
      console.error("[AUTO-FEATURE API] Error fetching listing:", listingError);
      return NextResponse.json(
        { error: "Failed to fetch listing details" },
        { status: 500 }
      );
    }

    // Calculate days until expiration
    const daysUntilExpiration = Math.ceil(
      (new Date(listing.expires_at).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If listing expires in less than 15 days, extend it to 30 days
    const newExpiresAt = daysUntilExpiration <= 15 
      ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(listing.expires_at);

    // Update the listing first
    const { error: updateError } = await supabaseAdmin
      .from("listings")
      .update({ 
        featured_until: endDate.toISOString(),
        expires_at: newExpiresAt.toISOString() 
      })
      .eq("id", listingId);

    if (updateError) {
      console.error("[AUTO-FEATURE API] Error updating listing:", updateError);
      return NextResponse.json(
        { error: "Failed to update listing" },
        { status: 500 }
      );
    }

    // Feature the listing
    const { data: featuredData, error: featuredError } = await supabaseAdmin
      .from("featured_listings")
      .insert({
        listing_id: listingId,
        user_id: userId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
      .select();

    if (featuredError) {
      console.error("[AUTO-FEATURE API] Error featuring listing:", featuredError);
      return NextResponse.json(
        { error: "Failed to feature listing", details: featuredError },
        { status: 500 }
      );
    }

    // Record the transaction - using admin client to bypass RLS
    try {
      const { error: transactionError } = await supabaseAdmin
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: 1,
          credit_type: "featured",
          status: "completed",
          description: `Featured listing ${listingId} for 15 days`,
          type: "debit"  // Ensure this is always set
        });

      if (transactionError) {
        console.error("[AUTO-FEATURE API] Error recording transaction:", transactionError);
        // Non-critical error, continue
      } else {
        console.log("[AUTO-FEATURE API] Transaction recorded successfully");
      }
    } catch (error) {
      console.error("[AUTO-FEATURE API] Error recording transaction:", error);
      // Non-critical error, continue with the process
    }

    return NextResponse.json({ 
      success: true,
      message: "Listing featured automatically",
      expiresAt: endDate.toISOString(),
      listingExpiresAt: newExpiresAt.toISOString()
    });
  } catch (error) {
    console.error("[AUTO-FEATURE API] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 