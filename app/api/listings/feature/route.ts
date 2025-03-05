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

    console.log("[FEATURE API] Featuring listing:", listingId, "for user:", userId);

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
      console.error("[FEATURE API] Error checking existing feature:", checkError);
      return NextResponse.json(
        { error: "Failed to check if listing is already featured" },
        { status: 500 }
      );
    }

    if (existingFeature) {
      console.error("[FEATURE API] Listing is already featured by this user");
      return NextResponse.json(
        { error: "This listing is already featured" },
        { status: 400 }
      );
    }

    // Check if user has feature credits
    const { data: creditsData, error: creditsError } = await supabaseAdmin
      .from("credits_featured")
      .select("amount")
      .eq("user_id", userId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') { // Not found error
      console.error("[FEATURE API] Error checking credits:", creditsError);
      return NextResponse.json(
        { error: "Failed to check feature credits" },
        { status: 500 }
      );
    }

    // If user has no credits or not enough credits
    if (!creditsData || creditsData.amount < 1) {
      console.error("[FEATURE API] User doesn't have enough credits");
      return NextResponse.json(
        { error: "You don't have enough feature credits" },
        { status: 400 }
      );
    }

    console.log("[FEATURE API] User has", creditsData.amount, "credits");

    // Calculate start and end dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // 7 days from now

    // Begin transaction
    // 1. Insert into featured_listings
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
      console.error("[FEATURE API] Error featuring listing:", featuredError);
      return NextResponse.json(
        { error: "Failed to feature listing", details: featuredError },
        { status: 500 }
      );
    }

    console.log("[FEATURE API] Featured listing created:", featuredData);

    // 2. Handle credits - if amount will be 0, delete the entry, otherwise update it
    let updateError = null;
    
    if (creditsData.amount === 1) {
      // If this is the last credit, delete the entry
      const { error } = await supabaseAdmin
        .from("credits_featured")
        .delete()
        .eq("user_id", userId);
      
      updateError = error;
      console.log("[FEATURE API] Deleted credits entry as amount reached 0");
    } else {
      // Otherwise, decrement the amount
      const { error } = await supabaseAdmin
        .from("credits_featured")
        .update({ amount: creditsData.amount - 1 })
        .eq("user_id", userId);
      
      updateError = error;
      console.log("[FEATURE API] Updated credits amount to", creditsData.amount - 1);
    }

    if (updateError) {
      console.error("[FEATURE CREDIT] Error updating feature credits:", updateError);
      // Try to rollback the featured listing we just created
      await supabaseAdmin
        .from("featured_listings")
        .delete()
        .eq("id", featuredData[0].id);

      return NextResponse.json(
        { error: "Failed to update credits", details: updateError },
        { status: 500 }
      );
    }

    // 3. Record the transaction - using admin client to bypass RLS
    try {
      const { error: transactionError } = await supabaseAdmin
        .from("credit_transactions")
        .insert({
          user_id: userId,
          amount: 1,
          credit_type: "featured",
          status: "completed",
          description: `Used 1 feature credit to feature listing ${listingId}`,
          type: "debit"
        });

      if (transactionError) {
        console.error("[FEATURE API] Error recording transaction:", transactionError);
        // Non-critical error, continue
      } else {
        console.log("[FEATURE API] Transaction recorded successfully");
      }
    } catch (error) {
      console.error("[FEATURE API] Error recording transaction:", error);
      // Non-critical error, continue with the process
    }

    return NextResponse.json({ 
      success: true,
      message: "Listing featured successfully",
      expiresAt: endDate.toISOString()
    });
  } catch (error) {
    console.error("[FEATURE API] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 