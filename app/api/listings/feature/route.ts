import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // Check if user has feature credits
    const { data: creditsData, error: creditsError } = await supabase
      .from("credits_featured")
      .select("amount")
      .eq("user_id", userId)
      .single();

    if (creditsError) {
      console.error("[FEATURE API] Error checking credits:", creditsError);
      return NextResponse.json(
        { error: "Failed to check feature credits" },
        { status: 500 }
      );
    }

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
    const { data: featuredData, error: featuredError } = await supabase
      .from("featured_listings")
      .upsert({
        listing_id: listingId,
        user_id: userId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
      .select();

    if (featuredError) {
      console.error("[FEATURE API] Error featuring listing:", featuredError);
      return NextResponse.json(
        { error: "Failed to feature listing" },
        { status: 500 }
      );
    }

    console.log("[FEATURE API] Featured listing created:", featuredData);

    // 2. Deduct one credit from user
    const { error: updateError } = await supabase
      .from("credits_featured")
      .update({ amount: creditsData.amount - 1 })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[FEATURE API] Error updating credits:", updateError);
      // Try to rollback the featured listing
      await supabase
        .from("featured_listings")
        .delete()
        .eq("listing_id", listingId);

      return NextResponse.json(
        { error: "Failed to update credits" },
        { status: 500 }
      );
    }

    console.log("[FEATURE API] Credits updated successfully");

    // 3. Record the transaction
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        amount: 1,
        credit_type: "featured",
        status: "completed",
        description: `Used 1 feature credit to feature listing ${listingId}`
      });

    if (transactionError) {
      console.error("[FEATURE API] Error recording transaction:", transactionError);
      // Non-critical error, continue
    } else {
      console.log("[FEATURE API] Transaction recorded successfully");
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