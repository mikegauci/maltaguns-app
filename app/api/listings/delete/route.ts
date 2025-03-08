import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with admin privileges to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { listingId, userId } = await request.json();

    if (!listingId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("[DELETE API] Attempting to delete listing:", listingId, "for user:", userId);

    // First verify that the user owns this listing
    const { data: listingData, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("seller_id", userId)
      .single();

    if (listingError) {
      console.error("[DELETE API] Error finding listing:", listingError);
      return NextResponse.json(
        { error: "Listing not found or permission denied" },
        { status: 404 }
      );
    }

    // Begin cascading delete of all related records
    console.log("[DELETE API] Beginning cascading delete...");

    // 1. Delete featured_listings entries
    const { error: featuredError } = await supabaseAdmin
      .from("featured_listings")
      .delete()
      .eq("listing_id", listingId);

    if (featuredError) {
      console.error("[DELETE API] Error removing from featured listings:", featuredError);
      // Continue despite this error
    }

    // 2. Delete saved_listings entries
    const { error: savedError } = await supabaseAdmin
      .from("saved_listings")
      .delete()
      .eq("listing_id", listingId);

    if (savedError) {
      console.error("[DELETE API] Error removing from saved listings:", savedError);
      // Continue despite this error
    }

    // 3. Delete listing_reports entries
    const { error: reportsError } = await supabaseAdmin
      .from("report_listings")
      .delete()
      .eq("listing_id", listingId);

    if (reportsError) {
      console.error("[DELETE API] Error deleting listing reports:", reportsError);
      // Continue despite this error
    }

    // 4. Delete messages related to this listing (if applicable)
    // This would depend on your schema, adjust as needed
    const { error: messagesError } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("listing_id", listingId);

    if (messagesError) {
      console.error("[DELETE API] Error deleting messages:", messagesError);
      // Continue despite this error
    }

    // 5. Delete the listing itself
    const { error: deleteError } = await supabaseAdmin
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (deleteError) {
      console.error("[DELETE API] Error deleting listing:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete listing", details: deleteError },
        { status: 500 }
      );
    }

    console.log("[DELETE API] Listing deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully"
    });
  } catch (error) {
    console.error("[DELETE API] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 