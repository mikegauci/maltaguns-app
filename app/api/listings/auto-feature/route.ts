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
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    // Feature the listing by inserting into featured_listings
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

    console.log("[AUTO-FEATURE API] Featured listing created:", featuredData);

    // Record the transaction - using admin client to bypass RLS
    try {
      const { error: transactionError } = await supabaseAdmin
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: 1,
          credit_type: "featured",
          status: "completed",
          description: `Featured listing ${listingId} for 30 days`,
          type: "debit"
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
      expiresAt: endDate.toISOString()
    });
  } catch (error) {
    console.error("[AUTO-FEATURE API] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 