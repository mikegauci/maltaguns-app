import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Price ID for featured listing
const FEATURE_LISTING_PRICE_ID = "price_1QydHBLT4uq5YHtWYofw182m";

// Helper function to generate a slug from a string
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

export async function POST(request: Request) {
  try {
    const { userId, listingId } = await request.json();
    
    if (!userId || !listingId) {
      return NextResponse.json(
        { error: "Missing required fields: userId and listingId" },
        { status: 400 }
      );
    }
    
    console.log("[CHECKOUT] Creating feature checkout for listing:", listingId, "by user:", userId);

    // Verify that the user exists in the profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[CHECKOUT] Error verifying user:", profileError);
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    // Verify the listing exists and belongs to the user and get its title for the slug
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, title")
      .eq("id", listingId)
      .eq("seller_id", userId)
      .single();
      
    if (listingError) {
      console.error("[CHECKOUT] Error verifying listing:", listingError);
      return NextResponse.json(
        { error: "Listing not found or does not belong to user" },
        { status: 400 }
      );
    }

    console.log("[CHECKOUT] User and listing verified");
    
    // Generate a slug from the listing title
    const slug = slugify(listing.title);

    // Create Stripe checkout session
    console.log("[CHECKOUT] Creating Stripe checkout session");
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/listing/${slug}?success=true`;
      
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: FEATURE_LISTING_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/listing/${slug}?canceled=true`,
      customer_email: profile.email,
      metadata: {
        userId: userId,
        listingId: listingId,
      },
    });

    console.log("[CHECKOUT] Checkout session created:", session.id);
    
    // Pre-create a transaction record with pending status
    console.log("[CHECKOUT] Creating pending transaction record");
    const { error: transactionError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: userId,
        amount: 1,
        status: "pending",
        credit_type: "featured",
        description: `Feature listing purchase for listing ${listingId}`,
        stripe_payment_id: session.id
      });
      
    if (transactionError) {
      console.error("[CHECKOUT] Error creating transaction record:", transactionError);
      // Continue anyway as this is not critical
    } else {
      console.log("[CHECKOUT] Pending transaction record created");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[CHECKOUT] Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
} 