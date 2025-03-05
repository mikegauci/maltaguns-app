import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // First, check if the unique constraint exists and drop it
    const { error: checkError } = await supabase.rpc('check_and_drop_constraint', {
      constraint_name: 'featured_listings_listing_id_key',
      table_name: 'featured_listings'
    });

    if (checkError) {
      console.error("Error checking/dropping constraint:", checkError);
      return NextResponse.json(
        { error: "Failed to check/drop constraint", details: checkError },
        { status: 500 }
      );
    }

    // Add a new composite unique constraint
    const { error: addError } = await supabase.rpc('add_unique_constraint', {
      constraint_name: 'featured_listings_listing_id_user_id_key',
      table_name: 'featured_listings',
      column_names: ['listing_id', 'user_id']
    });

    if (addError) {
      console.error("Error adding new constraint:", addError);
      return NextResponse.json(
        { error: "Failed to add new constraint", details: addError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Featured listings table updated successfully"
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred", details: error },
      { status: 500 }
    );
  }
} 